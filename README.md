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

## Premissas e limites
- Taxas editáveis em **Ajustes** (CDI, IPCA, abertura dos cenários, % do CDI das metas). Valores de partida de nov/2026: CDI 13,65% a.a. (Selic meta 13,75% menos 0,10 p.p.) e IPCA 4,5% a.a. Atualize quando mudarem.
- Taxa anual vira mensal por equivalência `(1+a)^(1/12)-1`. IR regressivo por aporte (22,5% / 20% / 17,5% / 15%). Aportes entram no fim do mês.
- Taxas e inflação ficam fixas durante todo o prazo; renda variável não é modelada. É planejamento, não recomendação de investimento.

## Desenvolvimento
O código financeiro está entre os marcadores `NÚCLEO FINANCEIRO` e `FIM DO NÚCLEO` no `index.html` e tem testes: `node tests/core.test.js`.
Ao mudar o app, aumente a versão do cache em `sw.js` (`joint-v1` → `joint-v2`) para o celular atualizar.
