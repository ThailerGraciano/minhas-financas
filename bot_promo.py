import re
from telethon import TelegramClient, events

# instalar pip install telethon

# --- CONFIGURAÇÃO ---
API_ID = 35217819  # Substitua pelo seu API ID (número inteiro)
API_HASH = 'b9b93149531cf9b803090cebb1119a0d'  # Substitua pelo seu API Hash

ARQUIVO_KEYWORDS = 'palavras_chave.txt'

# Se quiser monitorar canais específicos, coloque o @username ou ID numérico.
# Deixe a lista vazia [] para monitorar TODOS os grupos e canais que você participa.
CHATS_MONITORADOS = []

client = TelegramClient('sessao_promo', API_ID, API_HASH)

def carregar_palavras():
    try:
        with open(ARQUIVO_KEYWORDS, 'r', encoding='utf-8') as f:
            return set(linha.strip().lower() for linha in f if linha.strip())
    except FileNotFoundError:
        return set()

def salvar_palavras(palavras):
    with open(ARQUIVO_KEYWORDS, 'w', encoding='utf-8') as f:
        for p in sorted(palavras):
            f.write(f"{p}\n")

keywords = carregar_palavras()

@client.on(events.NewMessage(chats='me'))
async def gerenciador_comandos(event):
    """Gerencia palavras-chave enviando mensagens nas suas próprias 'Mensagens Salvas'."""
    global keywords
    texto = (event.raw_text or "").strip()
    partes = texto.split(maxsplit=1)
    comando = partes[0].lower()

    if comando == '/add' and len(partes) > 1:
        nova = partes[1].strip().lower()
        keywords.add(nova)
        salvar_palavras(keywords)
        await event.reply(f"✅ Palavra-chave cadastrada: **{nova}**")

    elif comando in ['/del', '/remover'] and len(partes) > 1:
        alvo = partes[1].strip().lower()
        if alvo in keywords:
            keywords.remove(alvo)
            salvar_palavras(keywords)
            await event.reply(f"🗑️ Palavra-chave removida: **{alvo}**")
        else:
            await event.reply(f"⚠️ A palavra **{alvo}** não estava na lista.")

    elif comando in ['/list', '/listar']:
        if not keywords:
            await event.reply("Nenhuma palavra-chave cadastrada no momento.")
        else:
            lista = "\n".join(f"• {k}" for k in sorted(keywords))
            await event.reply(f"📋 **Palavras-chave ativas ({len(keywords)}):**\n\n{lista}")

    elif comando in ['/ajuda', '/help']:
        ajuda = (
            "🤖 **Controle de Alertas:**\n"
            "• `/add termo`: adiciona uma nova palavra ou frase\n"
            "• `/del termo`: remove um alerta\n"
            "• `/listar`: vê todas as palavras ativas"
        )
        await event.reply(ajuda)

@client.on(events.NewMessage)
async def filtrar_promocoes(event):
    # Ignora mensagens de chats privados e mensagens enviadas por você
    if event.is_private or event.out:
        return

    # Se houver lista de chats especificada, filtra por ela
    if CHATS_MONITORADOS:
        username = getattr(event.chat, 'username', None)
        if event.chat_id not in CHATS_MONITORADOS and (not username or f"@{username}" not in CHATS_MONITORADOS):
            return

    texto_msg = (event.raw_text or "").lower()
    if not texto_msg or not keywords:
        return

    for kw in keywords:
        # Busca a palavra ou frase completa no texto
        if re.search(r'\b' + re.escape(kw) + r'\b', texto_msg, re.IGNORECASE):
            nome_chat = getattr(event.chat, 'title', 'Canal de Promoções')
            aviso = f"🎯 **Promoção encontrada!**\nTermo: `{kw}`\nCanal: **{nome_chat}**"
            
            # Envia notificação e encaminha a mensagem original para suas Mensagens Salvas
            await client.send_message('me', aviso)
            await event.forward_to('me')
            break

async def main():
    print("Monitor rodando. Envie comandos para suas 'Mensagens Salvas' no Telegram.")

with client:
    client.loop.run_until_complete(main())
    client.run_until_disconnected()