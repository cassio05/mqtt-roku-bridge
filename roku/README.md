# MQTT Relays EMQX — versão redesenhada

Esta versão aplica um painel escuro para TV, com grade de oito canais, cards de alto contraste, feedback visual de estado e foco animado durante a navegação com o controle remoto.

## Controles

- **Setas:** navegam entre os canais.
- **OK:** alterna o estado do canal selecionado.
- **OPTIONS** ou **asterisco (`*`):** abre o editor de nome do botão.
- **SALVAR:** grava o novo nome no registry do Roku.
- **CANCELAR:** fecha o editor sem alterar o nome.

## Estrutura

O layout principal está em `components/MainScene.xml`, a lógica de interação e MQTT em `components/MainScene.brs`, e o card individual em `components/RelayItem.xml`. Os assets de estado estão em `images/btn_power_green.png` e `images/btn_power_red.png`; `app_icon.png` e `app_splash.png` são usados pelo manifesto.

A grade utiliza os campos especiais de foco do `MarkupGrid` (`itemHasFocus` e `focusPercent`) para suavizar a escala e o brilho do card ativo. Os nomes editados continuam persistentes por meio da seção `RelayConfig` do registry.

## Integração com a ponte

Em `components/MainScene.brs`, configure `m.bridgeBaseUrl` com o domínio HTTPS publicado desta ponte. O app chama `/api/bridge/publish` para comandos e `/api/bridge/wait?since=<versão>` para receber alterações. A leitura espera até 30 segundos e reinicia automaticamente, mantendo a interface responsiva.

O app Roku não contém usuário ou senha do EMQX. O token compartilhado protege a API da ponte e não é mostrado na interface. As credenciais MQTT ficam somente nos segredos do servidor.
