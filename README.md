# GuildBook

Aplicação médica para consulta rápida de medicamentos e geração de receituários.

## Acesso público

Após a publicação da branch `main` pelo GitHub Actions, o aplicativo fica em
<https://jvac02.github.io/GuildBook-/>. O workflow publica o conteúdo de `web/`
na raiz do site do projeto. Em **Settings → Pages → Build and deployment**, a
fonte deve estar definida como **GitHub Actions**.

Para desenvolvimento local, use `npm run preview`. Esse comando não é necessário
para acessar a versão publicada.

## Estado atual

Reconstrução do núcleo do projeto.

Fase inicial:
- Dipirona
- Cetoprofeno

Após validação da arquitetura e interface, o catálogo será expandido progressivamente.

## Repositório histórico

O projeto anterior está preservado em:

JVAC02/GuildBook-Legacy

Esse repositório não é fonte de código para o GuildBook atual.

## Fluxo compacto

A busca por nome ou nome comercial abre as apresentações no próprio medicamento.
O desenho e as regras aprovadas estão em [docs/COMPACT-FLOW.md](docs/COMPACT-FLOW.md).
A referência visual foi preservada em `docs/prototypes/guildbook-receita-compacta.html`.

Verificação local: `npm test`, `npm run build` e `npm run test:browser` (requer Playwright e Chromium disponíveis no ambiente).
