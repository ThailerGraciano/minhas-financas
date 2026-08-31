# Processo - Período de Competência

## Descrição
O mês financeiro no sistema não é estritamente o mês calendário (dia 1 ao dia 30). Ele é guiado por um `closing_day` (padrão dia 25) armazenado no [[DB - Settings]].

## Regra de Negócio
- O ciclo de um mês vai do dia `closing_day + 1` do mês anterior até o `closing_day` do mês atual.
- Consultas de dashboard, listagens de transações e relatórios devem realizar o filtro de datas baseando-se neste ciclo, e não do dia 1 ao 31.
- Essa regra afeta funções no frontend e no backend.
