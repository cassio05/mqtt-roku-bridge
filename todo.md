# Project TODO

- [x] Definir contrato da ponte para `casa/luz1` até `casa/luz8`.
- [x] Armazenar broker, porta, usuário e senha exclusivamente em segredos de servidor.
- [x] Implementar conexão MQTT sobre WSS na porta 8084 com reconexão automática.
- [x] Normalizar mensagens MQTT para ON/OFF e manter o último estado de cada canal.
- [x] Implementar API HTTPS para publicação de comandos pelo Roku.
- [x] Implementar endpoint de leitura/long-polling para alterações de estado em tempo real.
- [x] Adaptar as tarefas BrightScript para usar somente os endpoints da ponte.
- [x] Preservar alternância dos canais, persistência dos nomes e cards existentes.
- [x] Remover a mensagem visual de navegação com setas e OK.
- [x] Criar tela técnica restrita com conectividade e últimos estados, sem credenciais.
- [x] Aplicar redesign neon-noir cinematográfico com fundo azul-marinho, rosa quente, ciano, magenta e brilho futurista.
- [x] Adicionar testes unitários da normalização, estados, autenticação e endpoints.
- [x] Validar build, fluxo de falhas e empacotamento do Roku.
- [x] Salvar checkpoint final e entregar os pacotes e instruções de configuração.
- [x] Regenerar o ZIP Roku com o domínio HTTPS publicado `mqtt-rokubrd-rfo2fpeh.manus.space`.
