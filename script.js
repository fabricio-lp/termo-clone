var height = 6;
var width = 5;
var row = 0;
var col = 0;

var jogoEncerrado = false;
var palavraSecreta = "";
var toastTimeout;

window.onload = async function () {
  document.addEventListener("click", esconderMensagem);
  await carregarPalavraSecreta();
  iniciarJogo();
};

async function carregarPalavraSecreta() {
  try {
    const response = await fetch("src/palavras5.txt");
    const texto = await response.text();
    const palavras = texto
      .trim()
      .split("\n")
      .map((p) => p.trim().toUpperCase())
      .filter((p) => p.length > 0);
    palavraSecreta = palavras[Math.floor(Math.random() * palavras.length)];
  } catch (erro) {
    console.error("Erro ao carregar palavras:", erro);
    palavraSecreta = "TESTE";
  }
}

function iniciarJogo() {
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      let bloco = document.createElement("span");
      bloco.id = r.toString() + "-" + c.toString();
      bloco.classList.add("bloco");
      if (r === 0) {
        bloco.setAttribute("data-row", "ativo");
      } else {
        bloco.setAttribute("data-row", r.toString());
      }

      bloco.innerText = "";
      bloco.addEventListener("click", () => {
        if (r === row && !jogoEncerrado) {
          col = c;
          atualizarCursor();
        }
      });
      document.getElementById("quadro").appendChild(bloco);
    }
  }
  renderKeyboard();
  atualizarCursor();
}

let teclado = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L", "⌫"],
  ["Z", "X", "C", "V", "B", "N", "M", "ENTER"],
];

function renderKeyboard() {
  const container = document.getElementById("teclado");
  if (!container) return;

  for (let i = 0; i < teclado.length; i++) {
    const linhaAtual = teclado[i];
    const linhaTeclado = document.createElement("div");
    linhaTeclado.classList.add("linha_teclado");

    for (let j = 0; j < linhaAtual.length; j++) {
      const tecla = document.createElement("div");
      const valor = linhaAtual[j];
      tecla.classList.add("tecla");
      tecla.setAttribute("data-tecla", valor);
      tecla.innerText = valor;
      tecla.addEventListener("click", () => {
        handleVirtualKey(valor);
      });

      linhaTeclado.appendChild(tecla);
    }

    container.appendChild(linhaTeclado);
  }
}

function handleVirtualKey(key) {
  esconderMensagem();

  if (jogoEncerrado) return;

  if (key === "⌫") {
    if (col === width) col -= 1;
    const blocoAtual = document.getElementById(
      row.toString() + "-" + col.toString()
    );
    if (blocoAtual.innerText !== "") {
      blocoAtual.innerText = "";
    } else if (col > 0) {
      col -= 1;
      const blocoAnterior = document.getElementById(
        row.toString() + "-" + col.toString()
      );
      blocoAnterior.innerText = "";
    }
    atualizarCursor();
    return;
  }

  if (key === "ENTER") {
    const palavraDigitada = obterPalavraDigitada();
    if (palavraDigitada.length === width) {
      verificarPalavraAsync(palavraDigitada);
    }
    return;
  }

  if (key.length === 1 && /[A-Z]/.test(key)) {
    if (col >= width) return;
    const blocoAtual = document.getElementById(
      row.toString() + "-" + col.toString()
    );
    blocoAtual.innerText = key;
    blocoAtual.classList.add("pop");
    setTimeout(() => blocoAtual.classList.remove("pop"), 150);
    col += 1;
    atualizarCursor();
  }
}

document.addEventListener("keyup", (e) => {
  if (jogoEncerrado) return;

  if (e.code.startsWith("Key")) {
    const letra = e.code[3];
    handleVirtualKey(letra);
  } else if (e.code === "Backspace") {
    handleVirtualKey("⌫");
  } else if (e.code === "Enter") {
    handleVirtualKey("ENTER");
  }
});

async function verificarPalavraAsync(palavraDigitada) {
  const existe = await palavraExisteNaLista(palavraDigitada);
  if (!existe) {
    mostrarMensagem("Palavra não encontrada na lista!");
    adicionarShake();
    return;
  }

  await verificarPalavra();

  if (!jogoEncerrado) {
    row += 1;
    col = 0;
    for (let c = 0; c < width; c++) {
      const el = document.getElementById(row.toString() + "-" + c.toString());
      if (el) el.setAttribute("data-row", "ativo");
    }
  }
  atualizarCursor();
}

function obterPalavraDigitada() {
  let palavra = "";
  for (let c = 0; c < width; c++) {
    let bloco = document.getElementById(row.toString() + "-" + c.toString());
    palavra += bloco.innerText;
  }
  return removerAcentos(palavra).toUpperCase();
}

function removerAcentos(texto) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function palavraExisteNaLista(palavra) {
  const palavraSemAcento = removerAcentos(palavra);

  return fetch("src/palavras5.txt")
    .then((response) => response.text())
    .then((texto) => {
      const palavras = texto
        .trim()
        .split("\n")
        .map((p) => {
          return removerAcentos(p.trim().toUpperCase());
        });
      return palavras.includes(palavraSemAcento);
    })
    .catch(() => true);
}

async function verificarPalavra() {
  let correto = 0;
  const palavraSecretaSemAcento = removerAcentos(palavraSecreta).toUpperCase();
  const palavraDigitada = obterPalavraDigitada();
  console.log("Palavra secreta:", palavraSecretaSemAcento);

  const contagem = {};
  for (let i = 0; i < width; i++) {
    const ch = palavraSecretaSemAcento[i];
    contagem[ch] = (contagem[ch] || 0) + 1;
  }

  const status = new Array(width).fill("ausente");
  for (let i = 0; i < width; i++) {
    const letraDigitada = palavraDigitada[i];
    if (letraDigitada === palavraSecretaSemAcento[i]) {
      status[i] = "correto";
      contagem[letraDigitada] -= 1;
    }
  }

  const finalStatus = [];
  for (let i = 0; i < width; i++) {
    const letraAtual = palavraDigitada[i];
    if (status[i] === "correto") {
      finalStatus[i] = "correto";
    } else if (contagem[letraAtual] > 0) {
      finalStatus[i] = "presente";
      contagem[letraAtual] -= 1;
    } else {
      finalStatus[i] = "ausente";
    }
  }

  for (let i = 0; i < width; i++) {
    const blocoAtual = document.getElementById(
      row.toString() + "-" + i.toString()
    );
    const letraAtual = palavraDigitada[i];

    blocoAtual.classList.add("flip");
    await new Promise((r) => setTimeout(r, 225));

    if (finalStatus[i] === "correto") {
      blocoAtual.innerText = palavraSecreta[i];
      blocoAtual.classList.add("correto");
      correto += 1;
      updateKeyColor(letraAtual, "correto");
    } else if (finalStatus[i] === "presente") {
      blocoAtual.classList.add("presente");
      updateKeyColor(letraAtual, "presente");
    } else {
      blocoAtual.classList.add("ausente");
      updateKeyColor(letraAtual, "ausente");
    }
    await new Promise((r) => setTimeout(r, 50));
  }

  if (correto == width) {
    jogoEncerrado = true;
    mostrarMensagem("Parabéns! Você acertou a palavra!");
  } else if (row == height - 1) {
    adicionarShake();
    jogoEncerrado = true;
    mostrarMensagem("A palavra era: " + palavraSecreta);
  }

  function updateKeyColor(letra, status) {
    if (!letra || letra.length !== 1) return;
    const selec = document.querySelector(`[data-tecla="${letra}"]`);
    if (!selec) return;

    if (selec.classList.contains("correto")) return;

    if (status === "correto") {
      selec.classList.remove("presente", "ausente");
      selec.classList.add("correto");
    } else if (status === "presente") {
      if (selec.classList.contains("ausente")) {
        selec.classList.remove("ausente");
      }
      if (!selec.classList.contains("presente"))
        selec.classList.add("presente");
    } else if (status === "ausente") {
      if (
        !selec.classList.contains("presente") &&
        !selec.classList.contains("correto")
      ) {
        selec.classList.add("ausente");
      }
    }
  }
}

function mostrarMensagem(msg) {
  const toast = document.getElementById("toast-notification");
  if (toast) {
    toast.innerText = msg;
    toast.classList.add("show");

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      esconderMensagem();
    }, 5000);
  }
}

function esconderMensagem() {
  const toast = document.getElementById("toast-notification");
  if (toast) {
    toast.classList.remove("show");
  }
}

function atualizarCursor() {
  document
    .querySelectorAll(".cursor")
    .forEach((el) => el.classList.remove("cursor"));

  if (jogoEncerrado) return;
  const bloco = document.getElementById(row.toString() + "-" + col.toString());
  if (bloco) {
    bloco.classList.add("cursor");
  }
}

function adicionarShake() {
  for (let c = 0; c < width; c++) {
    const bloco = document.getElementById(row.toString() + "-" + c.toString());
    if (bloco) {
      bloco.classList.add("shake");
      setTimeout(() => {
        bloco.classList.remove("shake");
      }, 900);
    }
  }
}
