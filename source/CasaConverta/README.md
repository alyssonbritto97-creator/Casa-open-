# Casa+ — cota semanal, lista de compras e gastos da casa

© Converta+ — Desenvolvido por Jose Brito.

Como funciona
- O celular do **administrador** instala o app e liga o "servidor da casa". Os dados ficam só nesse celular.
- Os outros celulares, no **mesmo Wi-Fi**, abrem o endereço mostrado no app (ex.: http://192.168.0.10:8080) no navegador. Não precisa instalar nada.
- O administrador cria um PIN (só no celular dele) e cadastra as pessoas, a ordem da escala e a data de início.
- Todos veem quem compra na semana, a lista do que falta e os gastos. Todos podem pedir item, marcar "comprado" e registrar gasto.
- Só o administrador cadastra pessoas, troca a semana, define a meta de gasto do mês (opcional) e apaga itens ou gastos.
- O painel só mostra o que foi cadastrado: nada de dados de exemplo.

Cálculo da cota: soma dos gastos do período dividida igualmente entre as pessoas; mostra quem recebe e quem deve.

Limites
- Se o celular do administrador estiver desligado ou fora do Wi-Fi, ninguém acessa.
- Deixe-o carregando e sem economia de bateria para o Casa+.
- Funciona só dentro da rede da casa (sem internet e sem nuvem).

Compilar (GitHub, sem computador)
1. No repositório, crie o arquivo `.github/workflows/build-casa.yml` com o conteúdo do `build-casa.yml`.
2. Suba o arquivo `Z-Casa-Converta.zip` na raiz. A compilação começa sozinha (aba Ações).
3. Quando ficar verde, baixe `Casa-APK` em Artefatos, extraia e instale o `Casa-Converta.apk`.
