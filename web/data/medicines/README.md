# Cadastro de apresentações

O catálogo em `index.json` aponta para um JSON por medicamento. O exportador standalone lê essa lista; cadastrar outro medicamento não exige editar o motor nem o exportador.

Cada apresentação possui seus próprios `regimens`, `sourceIds` e, quando confirmados, dados de embalagem. Um regime pediátrico é identificado por `population: "pediatric"` na apresentação pertinente. A forma farmacêutica não determina a população. Sem regime e fonte confirmados, não adicionar uma apresentação à pediatria.

## Metadados pediátricos opcionais

`presentation.pediatric` pode declarar `pediatricAllowed`, `minAgeMonths`, `maxAgeMonths`, `minWeightKg`, `maxWeightKg`, `doseKind`, `dosePerKg`, `fixedDose`, `maxDose`, `strengthMg`, `canSplit`, `allowedFractions`, `mustSwallowWhole` e `sourceIds`, conforme a fonte daquela apresentação. Limites também podem estar em `regimen.dose`. Ausência de um campo não autoriza inferência; peso ou idade só são pedidos quando afetam o regime. `canSplit` só permite a fração se `allowedFractions` também a contiver.

## Dispensação opcional por apresentação

`packageSizes` registra os tamanhos confirmados. `packageUnit` é o recipiente, quando confirmado (por exemplo, `frasco` ou `bisnaga`); `packageSizeUnit` é a unidade contida (por exemplo, `mL` ou `g`). Para apresentações antigas sem recipiente registrado, o texto usa apenas a quantidade medida, sem inventar uma caixa ou frasco.

`quantityPolicy` aceita `calculate`, `manual` ou `none`. Se ausente, o motor usa `regimen.quantityKind`: `facility` não gera dispensação, `variable` pede escolha e os demais calculam somente com dose, intervalo e duração válidos. Quando há tamanhos cadastrados, o cálculo sugere a menor combinação suficiente. Sem cálculo, nenhuma embalagem é selecionada: o prescritor escolhe uma opção gerada de `packageSizes` ou informa quantidade manual. `canFractionate` libera quantidade fracionária de sólidos somente quando confirmada.

Para ampliar o catálogo, acrescentar dados e fontes da apresentação, registrar o medicamento em `index.json` e criar testes de elegibilidade, dose e quantidade pertinentes. Não alterar dados clínicos para fazer testes passarem.

## Associações clínicas

`clinicalRelations` é a fonte estruturada de verdade para novas associações. Cada relação declara `conditionId` do registro em `../clinical/conditions.json`, `type` (`indication`, `symptomatic`, `prophylaxis` ou `adjunct`) e `sourceIds` existentes em `sources` do próprio medicamento. A relação descreve descoberta de recursos; não seleciona apresentação, população, dose ou receituário.

O antigo `indications` não alimenta a busca clínica. Os valores atuais com correspondência confirmada foram migrados para `clinicalRelations`. Em medicamentos futuros ainda em transição, texto legado sem correspondência canônica permanece no arquivo e é informado pelo gerador como pendente de revisão; ele não recebe um `conditionId` inferido. Texto legado que coincide com nome ou alias canônico causa erro até ser migrado explicitamente, impedindo duas fontes para a mesma relação.

Execute `npm run clinical:index` depois de alterar condições, relações ou calculadoras. O arquivo `../clinical/index.json` é derivado, contém apenas IDs relacionados e é verificado por `npm test`. O preview e o exportador standalone também o regeneram uma vez antes de servir ou exportar a aplicação. A busca usa esse índice e o catálogo leve; o JSON completo do medicamento só é carregado ao abrir seu fluxo normal.
