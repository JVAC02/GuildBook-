# Biblioteca compacta — decisão aprovada em 21/10/2026

Referência visual: [protótipo aprovado](prototypes/guildbook-receita-compacta.html).
É uma demonstração histórica; o produto usa os motores e componentes reais do v7.

- Busca por medicamento/nome comercial em destaque; catálogo atual limitado a Dipirona e Cetoprofeno.
- Um medicamento expandido por vez, apresentações no próprio item, ajustes e prévia após a seleção.
- Rascunhos por medicamento, apresentação e população; mudar de contexto revalida elegibilidade e dose.
- Nome da receita: composto + concentração; liberação permanece nos detalhes técnicos.
- Quantidade única abreviada: CP, CAP, AMP, FA, FR, CX, TB e mL; sem “caixa com N comprimidos”.
- Dipirona sintomática: “SE DOR OU FEBRE”; período serve ao cálculo de quantidade, sem impor tratamento por X dias.
- Montador, prévia e impressão usam o mesmo formatador. Preservar dados e limites clínicos existentes.
- Sem novos medicamentos, blocos, login ou integração com ClinCod nesta alteração.
- Alteração em branch própria com PR, sem merge nem deploy em produção.

## Implementação e verificação

1. Testes de receita: abreviações, condição sintomática por metadados, período só para cálculo, nome compacto e edição no Montador.
2. Biblioteca: expandir/recolher, selecionar apresentação, restaurar rascunhos, atualizar idade/peso e busca por aliases sem carregar todo o catálogo.
3. Testes de navegador desktop/celular: fluxo até Montador, limites pediátricos, busca, responsividade e console.
4. Regenerar standalone, executar suíte e build, revisar diff e abrir PR.

Não alterar algoritmos de dose ou dispensação. A apresentação da quantidade é independente do cálculo/embalagem real.

Itens já salvos no Montador são reformatados ao carregar, sem mudar suas doses ou quantidades numéricas. Rascunhos de edição ficam na sessão; a persistência dos itens do Montador continua no navegador.

Revisão final: mudança de peso mantém a dose inválida disponível para correção; foco do teclado acompanha os controles; navegação por histórico cancela expansões pendentes. Os três casos têm regressões de navegador.
