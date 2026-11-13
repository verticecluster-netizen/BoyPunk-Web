# Análise e composição musical — BoyPunk! Web 0.2.0

## Referência real do menu

Arquivo preservado: `assets/audio/menu-music.webm`.

Medições feitas com `ffprobe` e filtros `volumedetect`, `ebur128` e `astats` do
FFmpeg em 2026-10-22:

- Opus, estéreo, 48 kHz, aproximadamente 107 kb/s;
- duração de 53,345 s;
- loudness integrado de −14,2 LUFS, LRA de 1,8 LU e true peak de −2,9 dBFS;
- RMS global medido próximo de −15,7 dBFS e DC offset desprezível;
- uma autocorrelação do envelope RMS/onsets (mono 8 kHz, janela de 50 ms e passo
  de 20 ms) apontou 130,5 BPM como candidato mais forte, com candidatos próximos
  entre 127,25 e 137 BPM. É uma estimativa de sinal, não uma marcação musical
  confirmada por audição.

Não houve reprodução auditiva humana disponível nesta execução. Por isso não se
atribui, como fato, instrumentação, timbres específicos, harmonia ou motivo
melódico à referência. A LRA baixa indica energia técnica bastante constante, mas
não identifica arranjo. Essas limitações são deliberadamente separadas das
decisões criativas abaixo.

## Nova música da partida

Título: **Pulso do Distrito**. Origem: composição instrumental original por
código em `src/music.js`, sem sample musical externo.

Parâmetros verificáveis:

- 130 BPM, 4/4, 16 compassos e 29,538 s por volta;
- centro tonal de Ré menor;
- progressões Dm–Bb–F–C e Dm–Bb–C–A;
- baixo sincopado em duas camadas (saw e square filtradas);
- bumbo senoidal com queda de frequência, caixa/hi-hat de ruído determinístico;
- acordes curtos com saw/triangle e motivo de lead square/triangle;
- quatro seções de quatro compassos: entrada mais esparsa, corpo, respiro e
  retomada final com cadência alternativa;
- renderização uma vez por `OfflineAudioContext`, loop por `AudioBufferSourceNode`;
- compressor: threshold −18 dB, knee 12 dB, ratio 4:1, attack 8 ms e release 160 ms;
- teste automatizado no Chrome: pico do buffer −4,95 dBFS e RMS linear 0,0964.

O arranjo usa notas curtas e ganho conservador para reservar espaço a tiro, dano,
coleta e avisos. A troca de menu/partida aplica uma saída de 160 ms e entrada de
240 ms. Reinícios reutilizam o buffer e mantêm no máximo uma fonte musical ativa.
Volume e mudo atingem tanto a música do menu quanto a trilha procedural.

## Limites da validação

As medições comprovam estrutura, sincronismo, margem digital e ausência de fontes
duplicadas na automação. Não comprovam ausência de saturação percebida em toda
caixa/fone, qualidade artística, semelhança auditiva de identidade ou fadiga ao
longo de uma partida humana. Esses itens exigem escuta e playtest.
