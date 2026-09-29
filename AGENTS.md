# AGENTS.md — GuildBook

## Projeto

Este repositório é o GuildBook atual.

Fonte oficial única:
- GitHub: JVAC02/GuildBook-
- Branch principal: main

O repositório JVAC02/GuildBook-Legacy é apenas histórico.

NÃO consultar, copiar ou reutilizar código do GuildBook-Legacy,
salvo quando o proprietário solicitar explicitamente um item específico.

Não criar outro repositório GuildBook.

---

## Objetivo

GuildBook é uma aplicação médica de consulta rápida e apoio à prescrição.

O foco atual é construir primeiro um núcleo excelente de MEDICAMENTOS.

O projeto será expandido progressivamente para centenas de medicamentos,
mantendo consistência clínica, regulatória, arquitetural e visual.

Não adicionar funcionalidades futuras sem solicitação explícita.

Princípio geral:

MOTOR FORTE POR DENTRO.
INTERFACE SIMPLES POR FORA.

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
- embalagens;
- receituário;
- regras regulatórias de prescrição;
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
- dados regulatórios;
- dados de apresentações;
- testes.

Cada medicamento deve possuir seus dados clínicos isolados.

Alterar um medicamento não deve exigir carregar ou modificar todo o catálogo.

Novos medicamentos devem exigir principalmente:

DADOS + FONTES + TESTES

e não novas condições específicas no motor central.

Evitar regras como:

`if medicamento === "dipirona"`

`if medicamento === "amoxicilina"`

`if medicamento === "morfina"`

O motor deve interpretar os dados cadastrados.

Fluxo conceitual:

MEDICAMENTO
→ APRESENTAÇÃO
→ POPULAÇÃO
→ ELEGIBILIDADE
→ REGIME
→ DOSE
→ QUANTIDADE
→ EMBALAGEM
→ REGRA REGULATÓRIA
→ RECEITUÁRIO

Apresentações diferentes devem permanecer separadas.

Nunca presumir equivalência entre:

- concentrações;
- sais;
- formas farmacêuticas;
- vias;
- tipos de liberação;
- apresentações comerciais;
- regras regulatórias.

---

## Pediatria

Pediatria NÃO significa apresentação líquida.

Selecionar sempre na ordem:

MEDICAMENTO
→ APRESENTAÇÃO
→ REGIME POR POPULAÇÃO

Não excluir automaticamente:

- comprimidos;
- cápsulas;
- sachês;
- dispersíveis;
- injetáveis;
- outras formas sólidas ou não líquidas

apenas porque o paciente está em contexto pediátrico.

A elegibilidade deve considerar dados e fontes confirmados para aquela
apresentação/regime.

Nunca criar regra universal como:

`idade >= X → comprimido`

ou

`peso >= Y → comprimido`

Não existe corte universal aplicável a todos os medicamentos.

A elegibilidade depende de:

- medicamento;
- apresentação;
- regime;
- idade quando relevante;
- peso quando relevante;
- fonte clínica/regulatória.

### Fracionamento

Nunca presumir que comprimido pode ser partido.

Fracionamento só pode ser oferecido quando confirmado para aquela apresentação.

Não inventar:

- 1/2 comprimido;
- 1/4 comprimido;
- outras frações

apenas porque matematicamente produzem a dose desejada.

---

## Metadados por apresentação

Cada apresentação poderá possuir, quando aplicável:

- pediatricAllowed;
- minAgeMonths;
- maxAgeMonths;
- minWeightKg;
- maxWeightKg;
- doseKind;
- dosePerKg;
- fixedDose;
- maxDose;
- strengthMg;
- canSplit;
- allowedFractions;
- mustSwallowWhole;
- packageUnit;
- packageSizes;
- packageSizeUnit;
- quantityPolicy;
- canFractionate;
- sourceIds;
- regulatoryProfileId.

Nem todos os campos são obrigatórios em todas as apresentações.

A ausência de informação NÃO autoriza inferência.

---

## Quantidade e dispensação

A lógica de quantidade deve ser orientada pelos dados da apresentação.

Não criar regras diferentes por medicamento.

### Quando for possível calcular

Se houver:

- dose válida;
- frequência/intervalo;
- duração;
- dados suficientes da apresentação;

calcular a quantidade total necessária.

Exemplo conceitual:

necessário = 14 mL

embalagens cadastradas = 10 mL e 20 mL

resultado:

1 frasco de 20 mL

Regras:

- nunca sugerir menos que o tratamento calculado;
- preferir a menor combinação suficiente entre embalagens confirmadas;
- permitir alteração manual pelo prescritor.

### Quando não for possível calcular

Quando faltar duração ou outro dado essencial:

NÃO preencher silenciosamente:

`1 frasco`

NÃO usar como solução final desejável apenas:

`QTDE A DEFINIR`

Gerar opções rápidas a partir das embalagens REAIS cadastradas.

Exemplo:

Quantidade a dispensar

○ 1 frasco de 10 mL
○ 1 frasco de 20 mL
○ Definir manualmente

Nenhuma opção deve ser escolhida automaticamente.

Exigir confirmação do usuário.

### Quantidade variável

Quando não for possível calcular consumo de forma confiável:

- não inventar quantidade;
- permitir escolha de embalagem real quando apropriado;
- permitir quantidade manual.

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

Preservar:

- layout atual;
- identidade visual;
- hierarquia;
- simplicidade;
- baixa sobrecarga visual.

Não transformar novas funções em dashboards complexos.

Usar divulgação progressiva:

mostrar apenas o necessário naquele momento.

---

# REGULAÇÃO DE RECEITUÁRIOS

## Princípio fundamental

O tipo de receituário NUNCA deve ser inferido apenas pela classe terapêutica.

NUNCA assumir:

- opioide = receita amarela;
- psiquiátrico = receita azul;
- antidepressivo = receita de duas vias;
- antibiótico = Receita de Controle Especial;
- medicamento controlado = um único tipo de receita.

A regra deve ser definida conforme:

SUBSTÂNCIA
+ APRESENTAÇÃO
+ CONCENTRAÇÃO
+ REGRA REGULATÓRIA VIGENTE.

Consultar fonte regulatória oficial atual antes de cadastrar ou alterar
classificação de receituário.

---

## Perfis regulatórios

Não espalhar regras regulatórias em cada componente de interface.

Cada medicamento/apresentação deve apontar para um perfil regulatório,
por exemplo:

- simple;
- retained_prescription;
- special_control_2copies;
- notification_A;
- notification_B;
- outros perfis oficiais quando necessários.

O perfil define:

- tipo de receituário;
- quantidade de vias;
- retenção;
- campos obrigatórios;
- política do Montador;
- necessidade de modelo oficial;
- requisitos de impressão;
- requisitos eletrônicos/SNCR quando aplicáveis;
- fontes regulatórias.

Uma alteração futura da legislação deve preferencialmente exigir alteração
do perfil regulatório central, e não edição manual de centenas de medicamentos.

---

## Metadados regulatórios

Quando aplicável, usar estrutura equivalente a:

- regulatoryProfileId;
- builderPolicy;
- copies;
- retentionPolicy;
- requiresOfficialTemplate;
- regulatorySourceIds;
- regulatoryReviewedAt.

Não inventar classificação quando estiver ausente.

---

## Receita simples

Medicamentos compatíveis com receita simples podem utilizar o
Montador de Prescrição padrão.

Dados adicionais do prescritor podem permanecer opcionais somente quando
a legislação aplicável ao tipo de receita permitir.

---

## Receita sujeita à retenção

Receita sujeita à retenção NÃO deve ser confundida automaticamente com
Receita de Controle Especial.

Exemplo importante:

antimicrobianos possuem regras próprias de prescrição e retenção,
mas não utilizam automaticamente o modelo de Receita de Controle Especial.

Quando a legislação permitir receituário privativo/simples em duas vias,
o GuildBook pode gerar esse fluxo.

O documento deve cumprir os campos obrigatórios vigentes.

Se faltarem dados obrigatórios do emitente/paciente:

NÃO gerar silenciosamente um documento aparentemente válido.

Solicitar os dados faltantes antes da versão final.

---

## Receita de Controle Especial — duas vias

Medicamentos sujeitos à Receita de Controle Especial podem possuir
Montador específico SOMENTE quando o documento gerado cumprir as
exigências regulatórias vigentes.

Não tratar esse documento como simples duplicação da receita comum.

Os campos obrigatórios do modelo vigente devem ser respeitados.

A identificação do emitente deve seguir os requisitos oficiais vigentes,
incluindo endereço completo quando exigido.

Portanto:

campos de prescritor/emitente que são opcionais na receita simples
podem se tornar OBRIGATÓRIOS neste fluxo.

Se os dados obrigatórios estiverem ausentes:

- não gerar receita final válida;
- solicitar preenchimento;
- não preencher com dados fictícios;
- não usar endereço genérico;
- não inventar local de atendimento.

Sempre utilizar como referência normativa o modelo oficial vigente
publicado pela ANVISA.

Não usar mockups gerados por IA como fonte regulatória.

---

## Notificação de Receita A e B

Medicamentos sujeitos à:

- Notificação de Receita A;
- Notificação de Receita B;

NÃO devem utilizar o Montador de Prescrição comum.

NÃO gerar documento que simule uma Notificação oficial.

NÃO criar formulário amarelo/azul próprio apenas pela aparência.

Nesses medicamentos, o GuildBook deve fornecer:

- apresentação;
- indicação;
- dose;
- posologia;
- limites;
- alertas;
- orientação de prescrição;
- tipo de receituário exigido;
- fontes.

A política do Montador deve ser:

`education_only`

ou equivalente.

Exibir algo como:

“Este medicamento exige Notificação de Receita específica.
Consulte o fluxo regulatório aplicável.”

Sem botão para gerar uma falsa Notificação oficial.

---

## Receituário eletrônico e SNCR

Nunca assumir que uma receita em papel e uma receita eletrônica possuem
exatamente o mesmo fluxo.

Para receitas eletrônicas sujeitas às regras do SNCR:

- seguir requisitos atuais da ANVISA;
- utilizar modelos oficiais quando exigidos;
- não customizar modelos eletrônicos oficiais quando isso for proibido;
- não simular integração com o SNCR;
- não gerar numeração fictícia;
- não gerar QR Code fictício;
- não alegar validade eletrônica sem integração/requisitos necessários.

Quando o GuildBook não possuir integração regulatória necessária,
limitar-se ao fluxo permitido ou conteúdo educacional.

---

## Campos obrigatórios e dados do atendimento

O bloco atual de:

“Dados opcionais do prescritor e atendimento”

NÃO é universalmente opcional.

A obrigatoriedade deve depender do perfil regulatório.

Receita simples:
→ campos podem permanecer opcionais quando permitido.

Receita sujeita à retenção:
→ tornar obrigatórios os campos exigidos pela norma correspondente.

Receita de Controle Especial:
→ tornar obrigatórios os campos exigidos pelo modelo vigente.

Notificação A/B:
→ não utilizar Montador comum.

Nunca gerar:

- endereço fictício;
- consultório fictício;
- instituição fictícia;
- telefone fictício;
- CRM fictício;
- CNPJ/CNES fictício.

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
- indicação;
- embalagem;
- autorização pediátrica;
- possibilidade de fracionamento;
- classificação regulatória;
- tipo de receituário.

Quando uma informação não estiver confirmada:

- deixá-la ausente;
- ou sinalizar pendência.

Não criar fallback clínico baseado apenas no nome do medicamento.

---

## Fontes clínicas e regulatórias

Priorizar:

1. Ministério da Saúde;
2. ANVISA;
3. Bulário Eletrônico;
4. legislação sanitária vigente;
5. PCDTs;
6. RENAME quando pertinente;
7. sociedades médicas brasileiras;
8. documentos oficiais do fabricante;
9. PubMed/MEDLINE;
10. Cochrane;
11. SciELO.

Para classificação regulatória de receituário,
priorizar ANVISA e legislação sanitária oficial.

Não usar como fonte principal:

- Wikipédia;
- blogs;
- fóruns;
- redes sociais;
- agregadores comerciais quando existir fonte primária adequada.

RENAME não deve ser usada isoladamente como fonte de posologia.

---

## Atualização regulatória

Regras de receituário podem mudar.

Nunca assumir que uma regra antiga continua vigente apenas porque existe
no catálogo atual.

Ao:

- cadastrar novo perfil regulatório;
- alterar classificação de medicamento controlado;
- alterar modelo de receita;
- implementar receita eletrônica;

verificar a legislação/fonte oficial vigente.

Registrar a fonte utilizada.

---

## Testes

Antes de considerar uma tarefa concluída:

- executar testes relevantes;
- verificar desktop;
- verificar mobile quando houver mudança visual;
- verificar erros de console;
- verificar overflow;
- verificar build quando aplicável.

Não afirmar que algo funciona sem evidência.

Quando houver alteração regulatória, testar também:

- perfil regulatório correto;
- número de vias;
- retenção;
- campos obrigatórios;
- bloqueio do Montador quando necessário;
- ausência de documento oficial falso;
- comportamento quando dados obrigatórios estiverem ausentes.

Não modificar conteúdo clínico/regulatório apenas para fazer teste passar.

---

## Preview obrigatório antes do merge

Toda alteração visual ou funcional relevante deve possuir preview
antes do merge.

Validar:

- desktop;
- mobile;
- responsividade;
- console;
- overflow;
- regressões visuais;
- fluxo funcional relevante.

Se não existir serviço público de preview configurado,
usar o preview local disponível no ambiente e informar como abri-lo.

Não considerar uma alteração visual concluída apenas porque os testes
automatizados passaram.

---

## Git

Não fazer merge sem autorização explícita do proprietário.

Não alterar main diretamente durante desenvolvimento relevante.

Usar branches para alterações importantes.

Se já existir branch e Pull Request para o trabalho atual,
continuar neles quando solicitado pelo proprietário.

Não criar branch/PR duplicados sem necessidade.

Não apagar histórico ou branches sem autorização.

---

## Segurança

Nunca:

- inventar informação clínica;
- inventar regra regulatória;
- inventar apresentação;
- inventar embalagem;
- inventar dados do prescritor;
- inventar endereço;
- inventar numeração regulatória;
- criar falsa Notificação A/B;
- simular integração SNCR inexistente.

Quando houver dúvida regulatória:

PARAR A AUTOMAÇÃO DO RECEITUÁRIO
E PRIORIZAR ORIENTAÇÃO/VALIDAÇÃO.

---

## Regra final

O projeto deve crescer progressivamente.

Primeiro deixar poucos medicamentos excelentes.

Depois expandir em lotes usando o mesmo padrão aprovado.

Qualidade e consistência vêm antes de quantidade.

Para cada medicamento novo:

CLÍNICA
+ APRESENTAÇÃO
+ PEDIATRIA QUANDO APLICÁVEL
+ QUANTIDADE
+ EMBALAGEM
+ REGULAÇÃO
+ FONTES
+ TESTES

devem ser tratados como partes independentes porém integradas.

Nunca sacrificar segurança clínica ou regulatória para acelerar
a expansão do catálogo.

Nunca fazer merge sem autorização explícita do proprietário.
