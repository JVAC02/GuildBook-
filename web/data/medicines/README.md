# Cadastro de apresentações

O catálogo em `index.json` aponta para um JSON por medicamento. O exportador standalone lê essa lista; cadastrar outro medicamento não exige editar o motor nem o exportador.

Cada apresentação possui seus próprios `regimens`, `sourceIds` e, quando confirmados, dados de embalagem. Um regime pediátrico é identificado por `population: "pediatric"` na apresentação pertinente. A forma farmacêutica não determina a população. Sem regime e fonte confirmados, não adicionar uma apresentação à pediatria.

## Metadados pediátricos opcionais

`presentation.pediatric` pode declarar `pediatricAllowed`, `minAgeMonths`, `maxAgeMonths`, `minWeightKg`, `maxWeightKg`, `doseKind`, `dosePerKg`, `fixedDose`, `maxDose`, `strengthMg`, `canSplit`, `allowedFractions`, `mustSwallowWhole` e `sourceIds`, conforme a fonte daquela apresentação. Limites também podem estar em `regimen.dose`. Ausência de um campo não autoriza inferência; peso ou idade só são pedidos quando afetam o regime. `canSplit` só permite a fração se `allowedFractions` também a contiver.

## Dispensação opcional por apresentação

`packageSizes` registra os tamanhos confirmados. `packageUnit` é o recipiente, quando confirmado (por exemplo, `frasco` ou `bisnaga`); `packageSizeUnit` é a unidade contida (por exemplo, `mL` ou `g`). Para apresentações antigas sem recipiente registrado, o texto usa apenas a quantidade medida, sem inventar uma caixa ou frasco.

`quantityPolicy` aceita `calculate`, `manual` ou `none`. Se ausente, o motor usa `regimen.quantityKind`: `facility` não gera dispensação, `variable` pede escolha e os demais calculam somente com dose, intervalo e duração válidos. Quando há tamanhos cadastrados, o cálculo sugere a menor combinação suficiente. Sem cálculo, nenhuma embalagem é selecionada: o prescritor escolhe uma opção gerada de `packageSizes` ou informa quantidade manual. `canFractionate` libera quantidade fracionária de sólidos somente quando confirmada.

Para ampliar o catálogo, acrescentar dados e fontes da apresentação, registrar o medicamento em `index.json` e criar testes de elegibilidade, dose e quantidade pertinentes. Não alterar dados clínicos para fazer testes passarem.

### Texto sintomático e período de cálculo

O regime pode informar `asNeededReason` (por exemplo, `dor ou febre`) e `durationPurpose: "quantity"`. Nesse caso, o período continua alimentando o cálculo de dispensação, mas não aparece como tratamento obrigatório por X dias. Não inferir essas regras pelo nome do medicamento. Forma, via e liberação permanecem nos dados; a linha compacta da receita usa o composto e a concentração do rótulo.
