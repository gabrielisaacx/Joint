# Joint

App de finanças para o casal, feito como o app de treino: um PWA de arquivo único (`index.html`), dados salvos no aparelho e sincronização opcional via Google Sheets.

**O que faz**
- **Gastos:** lançamentos do mês (despesa, receita e acerto), categorias, fixos que se repetem sozinhos, limite por categoria e divisão entre o casal (50/50, só de um, ou % personalizada). O saldo "quem deve a quem" é acumulado e zera quando vocês registram o acerto.
- **Metas:** objetivos com prazo e quanto guardar por mês. Metas de **Viagem** têm orçamento item a item (passagens, hospedagem, passeios…) com margem de segurança.
- **Simulador:** de 1 mês a 20 anos, com CDB/Tesouro Selic (IR regressivo), LCI/LCA, poupança ou taxa própria; três cenários, valores de hoje (descontando o IPCA), aporte com reajuste anual e a conta inversa ("quanto guardar por mês para chegar em R$ X").

## Publicar (GitHub Pages)
1. No repositório: **Settings → Pages**.
2. Em *Build and deployment*: **Deploy from a branch**, branch `main`, pasta `/ (root)`. Salve.
3. Em 1 a 2 minutos o app abre em `https://<seu-usuario>.github.io/Joint/`.

## Instalar no celular
- **iPhone (Safari):** abrir o link → Compartilhar → **Adicionar à Tela de Início**.
- **Android (Chrome):** menu ⋮ → **Instalar app**.

## Sincronizar entre os dois celulares (opcional)
Sem isso cada aparelho guarda só os próprios dados.
1. Crie uma planilha no Google Sheets (nome livre, ex.: `Joint`).
2. **Extensões → Apps Script**, apague o conteúdo e cole o arquivo `Codigo.gs` deste repositório.
3. **Implantar → Nova implantação → App da Web**. Executar como: **Eu**. Quem pode acessar: **Qualquer pessoa**. Copie o link terminado em `/exec` (o PIN é o que protege os dados).
4. No app: avatar (canto superior direito) → **Ajustes → Sincronização**. Cole o link, escolham um **código do casal** (igual nos dois) e um **PIN** de 4+ caracteres (igual nos dois). Salvar.
5. Repita no outro celular com o mesmo link, código e PIN.

A mesclagem é por lançamento: o registro mais recente vence, e exclusões também sincronizam. Dois lançamentos feitos ao mesmo tempo em aparelhos diferentes não se perdem.

## Acesso (usuário + PIN)
- Na primeira abertura de cada aparelho, cada pessoa cria o próprio **usuário** e um **PIN de 4 números**. Nada disso vai no código: o app guarda só um hash PBKDF2 (150 mil iterações, sal aleatório) no aparelho.
- O app pede o login ao abrir e volta a bloquear depois de um tempo fora dele (padrão 5 min; em **Ajustes → Acesso** dá para escolher "ao sair", 1, 5 ou 15 min, bloquear na hora e alterar o PIN).
- Após 5 erros seguidos há espera de 30 s, que dobra a cada nova série de 5 (máximo de 15 min).
- **Esqueci o PIN** apaga todos os dados e ajustes daquele aparelho (inclusive a sincronização) e abre a criação de um novo acesso. Com a sincronização, reconecte para trazer os dados de volta.
- **Limite honesto:** é uma trava de tela. Os dados continuam no armazenamento do navegador sem criptografia, e 4 dígitos têm só 10 mil combinações; quem tiver acesso técnico ao aparelho desbloqueado ou ao arquivo do navegador consegue contornar. Ela protege contra quem pega o celular, não contra quem o analisa.

## Gamificação
Tudo é calculado a partir dos lançamentos; só se gravam as datas das conquistas e os dias marcados "hoje sem gastos". Nada pune ou compara os dois: o jogo é do casal contra a meta.
- **Sequência de registro:** dias seguidos com algum lançamento, aporte ou "hoje sem gastos". Fixos automáticos e acertos não contam. Lançar dias atrasados com a data certa recupera a sequência. Uma falha por trimestre é perdoada; a segunda zera.
- **Meses no plano:** meses fechados em que a poupança atingiu a meta de poupança dos Ajustes. O mês corrente não entra. Uma falha por semestre é perdoada.
- **Jornada da meta:** marcos de 25/50/75/100% com a data em que cada um foi cruzado, contagem regressiva (data do evento, se informada, ou fim do prazo) e ritmo (média dos aportes dos últimos 3 meses contra o aporte mensal necessário).
- **Conquistas:** 14 selos (primeiro lançamento, 7 e 30 dias de registro, mês no azul, 3 e 6 meses no plano, orçamento fiel, primeiro aporte, "Dupla" quando os dois aportam no mesmo mês, meta a 50% e cumprida, reserva de 1/3/6 meses). O **nível do casal** segue a reserva: metas que não são viagem, medidas em meses do gasto médio.
- Na sincronização a data de desbloqueio mais antiga prevalece, então os dois aparelhos concordam.

## Parcelas e cartões
- **Compra parcelada:** no lançamento de uma despesa, informe o número de parcelas (até 48). O app gera uma parcela por mês ("3/10"), divide o total sem perder centavos (a sobra vai na 1ª parcela) e mantém quem pagou e a divisão do casal. Editar uma parcela altera só ela; "Excluir esta e as seguintes" remove a série. Parcelas contam como compromisso fixo na projeção de fechamento do mês e a 2ª em diante não conta como registro do dia na gamificação.
- **Cartões** (Ajustes): nome, dia de fechamento, dia de vencimento e dono. Compra até o dia do fechamento entra na fatura do mês; depois, na seguinte. **O lançamento pesa no mês em que a fatura vence** (quando o dinheiro sai); a data de cada item continua sendo a da compra. Em **Gastos**, o cartão "Faturas" mostra total e vencimento por cartão. Fixos também podem ser lançados no cartão.
- **Comprometido** (início): soma de parcelas e faturas já lançadas para os próximos meses.
- **À vista x parcelado:** ao parcelar, o app mostra o desconto à vista a partir do qual vale pagar à vista: valor presente das parcelas aplicando o dinheiro a X% do CDI (premissa das metas) com IR regressivo e 1ª parcela em 30 dias. Se você informar o preço à vista, ele diz qual lado vence e os juros implícitos (a.a.).
- Mudar fechamento ou vencimento vale só para novos lançamentos; excluir um cartão mantém o histórico.

## Premissas e limites
- Taxas editáveis em **Ajustes** (CDI, IPCA, abertura dos cenários, % do CDI das metas). Valores de partida de nov/2026: CDI 13,65% a.a. (Selic meta 13,75% menos 0,10 p.p.) e IPCA 4,5% a.a. Atualize quando mudarem.
- Taxa anual vira mensal por equivalência `(1+a)^(1/12)-1`. IR regressivo por aporte (22,5% / 20% / 17,5% / 15%). Aportes entram no fim do mês.
- Taxas e inflação ficam fixas durante todo o prazo; renda variável não é modelada. É planejamento, não recomendação de investimento.

## Desenvolvimento
O código financeiro está entre os marcadores `NÚCLEO FINANCEIRO` e `FIM DO NÚCLEO` no `index.html` e tem testes: `node tests/core.test.js`.
Ao mudar o app, aumente a versão do cache em `sw.js` (`joint-v1` → `joint-v2`) para o celular atualizar.

## Diagnóstico financeiro
Na Home, o cartão **Diagnóstico financeiro** abre uma análise do mês (Casal, Gabriel ou Dayse) com nota de 0 a 100: Boa (75+), Atenção (50 a 74) ou Crítica (abaixo de 50). Critérios e pesos: poupança vs. meta (30), fixos e parcelas sobre a renda, folga até 35% (20), essenciais x desejos pela regra 50/30/20 (20), reserva de emergência em meses de gasto, só no casal (20) e tendência vs. média dos 3 meses anteriores (10). Gastar mais que a renda limita a nota a 49. Tudo é calculado no aparelho, por regras fixas, sem IA e sem enviar dados. Mês em andamento usa só o gasto até hoje. É um guia geral, não recomendação financeira personalizada.

## Fixos nos próximos meses
Fixos (marcados com "Repetir todo mês") aparecem no mês atual e nos 11 seguintes, para dar para acompanhar dezembro, janeiro etc. Editar o valor em Fixos muda só os meses seguintes ao atual e só os lançamentos que ninguém editou à mão; "Parar este fixo" remove os futuros e mantém o histórico. Para lançamentos que já existem, use **Fixos > Replicar lançamentos do mês** (ou o cartão que aparece na Home quando o mês seguinte está vazio): você escolhe quais viram fixos. Fixos de datas futuras não entram no saldo entre vocês nem no cartão Comprometido.

## Gráficos
- **Evolução (Home):** receita e despesa de 6 meses (3 anteriores, o atual e 2 futuros), com a sobra em número abaixo de cada mês. Meses futuros aparecem mais claros e mostram só o planejado. Toque num mês para ver os valores e abrir.
- **Ritmo do mês (Home):** gasto acumulado dia a dia contra o mês anterior. Toque para ver o valor de um dia.
- **Categorias:** cada barra traz um marcador da média dos até 3 meses anteriores e outro do limite, com a diferença em R$.
- **Diagnóstico:** barra por critério e nota mês a mês.

## Criptografia da sincronização (ponta a ponta)
Em Ajustes > Sincronização, defina uma **senha de criptografia** (8+ caracteres), a mesma nos dois celulares. Com ela, os dados saem do aparelho já cifrados e a planilha guarda só texto ilegível.
- Chave AES-256 derivada da senha com PBKDF2-SHA256 (600 mil iterações; sal = SHA-256 do código do casal). O aparelho guarda só a chave derivada, nunca a senha.
- Pacote: `e1:` + base64(IV de 12 bytes + AES-GCM). O código do casal entra como dado autenticado.
- Senha errada, senha ausente ou pacote adulterado: o app avisa, pausa a sincronização e **não sobrescreve** a nuvem.
- Não precisa reimplantar o `Codigo.gs`: o backend só guarda o texto.
- Limites: o PIN do espaço continua sendo o que autoriza gravar, então quem tiver link, código e PIN ainda pode apagar ou trocar o conteúdo da nuvem (os aparelhos mantêm a cópia local e recusam o que não abrir com a chave). Os dados no próprio aparelho seguem sem criptografia, protegidos pelo bloqueio do celular e pelo PIN do app. Sem recuperação de senha: se esquecer, defina uma nova nos dois aparelhos.

## Auditoria das contas (nov/2026)
Corrigido: (1) editar um fixo agora carimba os lançamentos futuros, para o outro aparelho receber o valor novo; (2) "Entre vocês" conta só despesas com data até hoje, sem parcelas e fixos a vencer; (3) a projeção de fechamento não multiplica pelo ritmo diário a fatura de compras do mês anterior; (4) no diagnóstico, a tendência só pontua com o mês fechado; (5) nuvem ilegível nunca é sobrescrita.
