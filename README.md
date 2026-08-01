# Garra Milionária

Laboratório web de máquinas de garra premiada, desenvolvido com foco em celulares, física visual e comparação entre diferentes modelos de jogo.

## Teste público

- **Portal das máquinas:** https://garra-premiada.vercel.app/maquinas
- **Garra Milionária 2D:** https://garra-premiada.vercel.app/garra-fisica
- **Arena 3D:** https://garra-premiada.vercel.app/garra-3d
- **Garra Box 3D:** https://garra-premiada.vercel.app/garra-cubos

O projeto é um protótipo demonstrativo. Não utiliza dinheiro real e não entrega prêmios reais.

## Versão principal: Garra Milionária 2D

A edição principal usa Rapier 2D para simular:

- objetos empilhados com gravidade, massa, atrito e colisões;
- garra com braços articulados e pontas emborrachadas;
- joystick analógico por arraste, teclado e controles direcionais;
- descida, fechamento, levantamento e transporte do prêmio;
- resultados de erro, quase captura e captura;
- inventário local de itens coletados;
- painel e iluminação inspirados em máquinas de salão e cassino.

## Controles

### Celular

- Toque em **JOGAR** para iniciar.
- Arraste o joystick para movimentar a garra.
- Incline o joystick para cima ou para baixo para mudar a profundidade.
- Toque em **PEGAR** para iniciar a descida.

### Computador

- `A` / `D` ou setas esquerda/direita: movimentação horizontal.
- `W` / `S` ou setas cima/baixo: profundidade.
- `Espaço` ou `Enter`: acionar a garra.
- Também é possível usar mouse ou touchscreen.

## Executar localmente

### Requisitos

- Node.js `>=22.13.0`
- pnpm 9 ou 10

```bash
git clone https://github.com/mcguaguim-art/garra-milionaria.git
cd garra-milionaria
pnpm install
pnpm dev
```

Abra o endereço exibido no terminal. Nenhuma variável de ambiente é necessária para executar o protótipo.

### Build de produção

```bash
pnpm build
```

O deploy da Vercel usa a configuração de [vercel.json](./vercel.json) e gera o site estático em `public-web/`.

## Tecnologias

- React 19
- TypeScript
- Vinext / Vite
- PixiJS
- Rapier 2D e Rapier 3D
- Matter.js
- Three.js
- Vercel

## Estrutura principal

```text
app/
  garra/                 Núcleo compartilhado e máquina física 2D
  garra-fisica/          Rota da Garra Milionária 2D
  garra-3d/              Experiência com modelos GLB
  garra-cubos/           Versão de cubos premiados
  portal/                Dashboard para escolher a máquina
public/
  prizes/                Imagens e texturas dos prêmios
  models/                Modelos tridimensionais
  environments/          Fundos e ambientes da máquina
```

## Roteiro para testadores

Ao testar, informe o modelo do aparelho, navegador e uma descrição curta do comportamento observado.

Verifique especialmente:

1. carregamento inicial da máquina;
2. resposta do joystick ao arrastar e soltar;
3. movimentação horizontal e mudança de profundidade;
4. fechamento da garra sem atravessar os objetos;
5. comportamento de erro, quase captura e vitória;
6. retorno da máquina para uma nova rodada;
7. rotação da tela e retomada após trocar de aplicativo;
8. estabilidade depois de várias rodadas na mesma sessão.

Erros podem ser enviados pela aba **Issues** do repositório, com captura de tela ou vídeo quando possível.

## Estado do projeto

O jogo continua em refinamento. A versão 2D está na etapa de calibração do contato entre pontas da garra e objetos. Consulte [FINALIZATION_PLAN.md](./FINALIZATION_PLAN.md) para o backlog atual.

## Aviso

Protótipo para testes de interface, física e experiência. Sem pagamentos, apostas ou premiação real. Uso recomendado apenas para maiores de 18 anos.
