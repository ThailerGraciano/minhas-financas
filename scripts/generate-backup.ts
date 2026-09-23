import dotenv from "dotenv";
import { execSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// Garante o carregamento do .env.local mesmo se executado diretamente sem flag
dotenv.config({ path: ".env.local" });

function commandExists(command: string): boolean {
  try {
    execSync(`which ${command}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(2)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

function getFormattedTimestamp(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

interface ParsedDbConfig {
  host: string;
  port: string;
  user: string;
  password?: string;
  database: string;
}

function parseDatabaseUrl(rawUrl: string): ParsedDbConfig {
  const parsed = new URL(rawUrl);
  return {
    host: parsed.hostname,
    port: parsed.port || "5432",
    user: decodeURIComponent(parsed.username),
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    database: parsed.pathname.replace(/^\//, ""),
  };
}

async function runDumpWithNativePgDump(config: ParsedDbConfig, targetFilePath: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const writeStream = fs.createWriteStream(targetFilePath);
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      PGHOST: config.host,
      PGPORT: config.port,
      PGUSER: config.user,
      PGDATABASE: config.database,
    };

    if (config.password !== undefined) {
      env.PGPASSWORD = config.password;
    }

    const child = spawn("pg_dump", ["--schema=public", "--clean", "--if-exists"], { env });

    child.stdout.pipe(writeStream);

    let errorOutput = "";
    child.stderr.on("data", (chunk: Buffer) => {
      errorOutput += chunk.toString();
    });

    child.on("error", (err: Error) => {
      reject(err);
    });

    child.on("close", (code: number | null) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`pg_dump falhou com código ${code ?? "desconhecido"}: ${errorOutput}`));
      }
    });
  });
}

async function runDumpWithDocker(config: ParsedDbConfig, targetFilePath: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const writeStream = fs.createWriteStream(targetFilePath);
    const dockerArgs = [
      "run",
      "--rm",
      "-i",
      "-e",
      `PGHOST=${config.host}`,
      "-e",
      `PGPORT=${config.port}`,
      "-e",
      `PGUSER=${config.user}`,
      "-e",
      `PGDATABASE=${config.database}`,
    ];

    if (config.password !== undefined) {
      dockerArgs.push("-e", `PGPASSWORD=${config.password}`);
    }

    dockerArgs.push("postgres:17-alpine", "pg_dump", "--schema=public", "--clean", "--if-exists");

    const child = spawn("docker", dockerArgs);

    child.stdout.pipe(writeStream);

    let errorOutput = "";
    child.stderr.on("data", (chunk: Buffer) => {
      errorOutput += chunk.toString();
    });

    child.on("error", (err: Error) => {
      reject(err);
    });

    child.on("close", (code: number | null) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Docker pg_dump falhou com código ${code ?? "desconhecido"}: ${errorOutput}`));
      }
    });
  });
}

async function main(): Promise<void> {
  const startTime = Date.now();
  console.log("📦 Iniciando processo de backup do banco de dados...");

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ Erro: Variável DATABASE_URL não encontrada no ambiente ou .env.local.");
    process.exit(1);
  }

  const backupDir = path.join(process.cwd(), "backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = getFormattedTimestamp(new Date());
  const backupFileName = `backup_${timestamp}.sql`;
  const backupFilePath = path.join(backupDir, backupFileName);
  const latestFilePath = path.join(backupDir, "backup_latest.sql");

  const config = parseDatabaseUrl(databaseUrl);

  try {
    const hasPgDump = commandExists("pg_dump");
    const hasDocker = commandExists("docker");

    if (hasPgDump) {
      console.log("🔹 Utilizando utilitário nativo pg_dump...");
      await runDumpWithNativePgDump(config, backupFilePath);
    } else if (hasDocker) {
      console.log("🔹 pg_dump nativo não encontrado. Utilizando container Docker (postgres:17-alpine)...");
      await runDumpWithDocker(config, backupFilePath);
    } else {
      throw new Error(
        "Nem pg_dump nem Docker foram encontrados no seu sistema. Instale o postgresql-client ou inicie o Docker para gerar o backup.",
      );
    }

    // Copia como backup_latest.sql para conveniência
    fs.copyFileSync(backupFilePath, latestFilePath);

    const stats = fs.statSync(backupFilePath);
    const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("\n=========================================");
    console.log("✅ BACKUP CONCLUÍDO COM SUCESSO!");
    console.log("=========================================");
    console.log(`📁 Arquivo gerado:  backups/${backupFileName}`);
    console.log(`🔗 Cópia recente:   backups/backup_latest.sql`);
    console.log(`📊 Tamanho total:   ${formatBytes(stats.size)}`);
    console.log(`⏱️  Tempo total:     ${durationSeconds}s`);
    console.log("=========================================\n");
  } catch (error) {
    // Em caso de falha, remove arquivo parcial se tiver sido criado
    if (fs.existsSync(backupFilePath)) {
      try {
        fs.unlinkSync(backupFilePath);
      } catch {
        // Ignora erro ao limpar arquivo temporário
      }
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error("\n❌ Falha ao gerar backup:", message);
    process.exit(1);
  }
}

main();
