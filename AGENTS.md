# AGENTS.md — GuildBook

## Projeto

Este repositório é o GuildBook atual.

Fonte oficial única:
- GitHub: JVAC02/GuildBook
- Branch principal: main

O repositório JVAC02/GuildBook-Legacy é apenas histórico.

NÃO consultar, copiar ou reutilizar código do GuildBook-Legacy,
salvo quando o proprietário solicitar explicitamente um item específico.

Não criar outro repositório GuildBook.

---

## Objetivo

GuildBook é uma aplicação médica de consulta rápida e prescrição.

O foco atual é construir primeiro um núcleo excelente de MEDICAMENTOS.

O projeto será expandido progressivamente.

Não adicionar funcionalidades futuras sem solicitação explícita.

---

## Escopo atual

Implementar e manter:

- medicamentos;
- apresentações;
- doses;
- adulto/pediatria quando aplicável;
- cálculo por peso quando necessário;
- duração;
- quantidade automática;
- receituário;
- segurança;
- fontes;
- busca;
- favoritos.

Não implementar sem solicitação:

- Patologias;
- Protocolos;
- Sala Vermelha;
- dashboards;
- grandes importações automáticas de medicamentos.

---

## Arquitetura

Priorizar código modular.

Evitar arquivos monolíticos.

Separar:

- interface;
- lógica;
- dados clínicos;
- testes.

Cada medicamento deve possuir seus dados clínicos isolados.

Alterar um medicamento não deve exigir carregar ou modificar todo o catálogo.

Apresentações diferentes devem permanecer separadas.

Nunca presumir equivalência entre:
- concentrações;
- sais;
- formas farmacêuticas;
- vias;
- tipos de liberação.

---

## Regra de UX

Não pedir informação que não altera o resultado.

Exemplos:

- não exigir idade de todo adulto;
- não exigir peso quando a dose não depende de peso;
- não exigir indicação clínica quando todas as indicações usam o mesmo esquema;
- não mostrar opções inválidas apenas para depois bloqueá-las.

A interface deve priorizar informação clínica útil.

Evitar mensagens internas de desenvolvimento na interface médica.

---

## Conteúdo clínico

Nunca inventar:

- apresentação;
- concentração;
- dose;
- intervalo;
- via;
- duração;
- quantidade;
- indicação.

Quando uma informação não estiver confirmada, deixá-la ausente ou sinalizar a pendência.

Não criar fallback clínico baseado apenas no nome do medicamento.

---

## Fontes clínicas

Priorizar:

1. Ministério da Saúde;
2. ANVISA / Bulário Eletrônico;
3. PCDTs;
4. RENAME quando pertinente;
5. sociedades médicas brasileiras;
6. documentos regulatórios ou fabricantes oficiais;
7. PubMed/MEDLINE;
8. Cochrane;
9. SciELO.

Não usar como fonte clínica principal:

- Wikipédia;
- blogs;
- fóruns;
- redes sociais;
- agregadores comerciais quando existir fonte primária adequada.

RENAME não deve ser usada isoladamente como fonte de posologia.

---

## Testes

Antes de considerar uma tarefa concluída:

- executar testes relevantes;
- verificar desktop e mobile quando houver mudança visual;
- verificar erros de console;
- verificar overflow;
- verificar build quando aplicável.

Não afirmar que algo funciona sem evidência.

---

## Git

Não fazer merge sem autorização explícita do proprietário.

Não alterar main diretamente durante desenvolvimento relevante.

Usar branches para alterações importantes.

Não apagar histórico ou branches sem autorização.

---

## Regra final

O projeto deve crescer progressivamente.

Primeiro deixar poucos medicamentos excelentes.

Depois expandir usando o mesmo padrão aprovado.

Qualidade e consistência vêm antes de quantidade.
