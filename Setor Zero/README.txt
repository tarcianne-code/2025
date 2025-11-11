SetorZero_RetroEdition_AI - Package
==================================

Conteúdo:
- sprites/: imagens pixel (tato, lata, documento, portao)
- sounds/: type.wav, alarm.wav, explosion.wav, ambience.wav
- SetorZero_Instructions_Blocks_AI.txt : instruções detalhadas dos blocos (inclui Web component para IA)
- diagram_ai.png : diagrama do fluxo e pontos de decisão com IA
- README.txt (este arquivo)

INTEGRAÇÃO DE IA (resumo técnico)
- Usamos Web component (Web1) para chamar uma API de IA.
- No App Inventor, configure Web1.Url dinamicamente (ex: OpenAI chat completions endpoint).
- Cabeçalhos necessários:
    "Content-Type": "application/json"
    "Authorization": "Bearer <SUA_CHAVE_AQUI>"
- Corpo JSON sugerido para OpenAI:
{
  "model":"gpt-4o-mini",
  "messages":[
    {"role":"system","content":"Você é um narrador emocional e literário para um jogo."},
    {"role":"user","content":"CONTEXT: {context}. OPTIONS: {option1} || {option2} || {option3}. Respond with: OPTION1||SCORE||COMMENT || OPTION2||SCORE||COMMENT || OPTION3||SCORE||COMMENT"}
  ]
}
- No Web1.GotText, faça parse por "||" e mapeie as opções com scores. Use o score para decidir qual opção tem mais chance de 'tocar' a IA.

MODO OFFLINE:
- Se não quiser usar API, defina IA_Ativa = false e carregue frases locais (predefinidas).

Segurança:
- Não exponha sua chave em builds públicos.
- Teste com AI2 Companion em rede segura.
