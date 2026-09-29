# Regras dos medicamentos

- Cada medicamento tem um JSON próprio; cada forma, concentração, liberação e via tem apresentação e esquema próprios.
- Confirmar apresentação, população, dose, intervalo, máximo, duração, contexto e preparo em bula brasileira pertinente antes de inserir.
- Registrar URL da fonte e associá-la à apresentação. RENAME isoladamente não valida dose.
- Não inferir pediatria, conversão gotas/mL, embalagem, duração nem via a partir de outra apresentação.
- Se a bula informa faixa de dose, conservar a faixa e exigir escolha clínica dentro dela.
- Se quantidade não pode ser calculada com rigor, não presumir 1 embalagem: oferecer somente embalagens confirmadas nos dados da apresentação e exigir escolha explícita, ou definição manual.
- Não inferir que pediatria exige líquido, nem idade/peso universal para comprimidos. Não esconder sólidos pediátricos com regime confirmado; fracionar somente com confirmação específica da apresentação.
- Rodar `npm test` e revisar receituário e limites por população após alteração.
