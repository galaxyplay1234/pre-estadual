const fs = require("fs");
const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");

const URL = "https://www.lchf.com.br/JogosCampeonato.aspx";

const CAMPEONATO_ID = "180";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36",

  "Accept":
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

  "Referer":
    URL
};

// =====================================================
// COOKIES
// =====================================================

let cookies = {};

function atualizarCookies(response) {

  const setCookie =
    response.headers.raw()["set-cookie"];

  if (!setCookie) return;

  for (const cookie of setCookie) {

    const parte =
      cookie.split(";")[0];

    const index =
      parte.indexOf("=");

    if (index === -1) continue;

    const nome =
      parte.substring(0, index);

    const valor =
      parte.substring(index + 1);

    cookies[nome] = valor;
  }
}

function cookieHeader() {

  return Object.entries(cookies)
    .map(([nome, valor]) => `${nome}=${valor}`)
    .join("; ");
}

function headersGet() {

  const headers = {
    ...HEADERS
  };

  const cookie =
    cookieHeader();

  if (cookie) {
    headers.Cookie = cookie;
  }

  return headers;
}

// =====================================================
// DOM
// =====================================================

function getDocument(html) {

  const dom =
    new JSDOM(html);

  return dom.window.document;
}

// =====================================================
// PEGA TODOS OS CAMPOS DO FORMULÁRIO
// =====================================================

function getFormFields(document) {

  const fields = {};

  const elements =
    document.querySelectorAll(
      "input, select, textarea"
    );

  elements.forEach(element => {

    const name =
      element.getAttribute("name");

    if (!name) return;

    // INPUT
    if (
      element.tagName.toLowerCase() ===
      "input"
    ) {

      const type =
        (
          element.getAttribute("type") ||
          "text"
        ).toLowerCase();

      // Não enviar checkbox/radio desmarcado
      if (
        (type === "checkbox" ||
          type === "radio") &&
        !element.checked
      ) {
        return;
      }

      // Botões serão adicionados manualmente
      if (
        type === "submit" ||
        type === "button" ||
        type === "image" ||
        type === "reset"
      ) {
        return;
      }

      fields[name] =
        element.value || "";

      return;
    }

    // SELECT
    if (
      element.tagName.toLowerCase() ===
      "select"
    ) {

      const selected =
        element.querySelector(
          "option:checked"
        ) ||
        element.querySelector(
          "option[selected]"
        );

      fields[name] =
        selected?.value || "";

      return;
    }

    // TEXTAREA
    if (
      element.tagName.toLowerCase() ===
      "textarea"
    ) {

      fields[name] =
        element.value || "";

    }

  });

  return fields;
}

// =====================================================
// CAMPEONATO
// =====================================================

function getCampeonatoSelecionado(document) {

  const select =
    document.querySelector(
      "#ctl00_MainContent_ddlCampeonato"
    );

  if (!select) {
    return null;
  }

  const selected =
    select.querySelector(
      "option:checked"
    );

  if (!selected) {
    return null;
  }

  return {
    id:
      selected.value,

    nome:
      selected.textContent.trim()
  };
}

// =====================================================
// RODADA
// =====================================================

function getRodada(document) {

  return (
    document
      .querySelector(
        "#ctl00_MainContent_lblRodada"
      )
      ?.textContent
      .trim() || ""
  );
}

function getNumeroRodada(texto) {

  const match =
    texto.match(
      /Rodada\s+(\d+)/i
    );

  return match
    ? Number(match[1])
    : 1;
}

function getTotalRodadas(texto) {

  const match =
    texto.match(
      /de\s+(\d+)/i
    );

  return match
    ? Number(match[1])
    : 1;
}

// =====================================================
// PARSE JOGOS
// =====================================================

function parseJogos(document) {

  const tabela =
    document.querySelector(
      "table.point-table"
    );

  if (!tabela) {
    return [];
  }

  const jogos = [];

  tabela
    .querySelectorAll("tr")
    .forEach((tr, i) => {

      if (i === 0) return;

      const td =
        tr.querySelectorAll("td");

      if (td.length < 6) return;

      const inputs =
        td[2].querySelectorAll(
          "input"
        );

      const mandante =
        td[1].textContent.trim();

      const visitante =
        td[3].textContent.trim();

      if (
        !mandante &&
        !visitante
      ) {
        return;
      }

      jogos.push({

        mandante,

        visitante,

        gols_mandante:
          inputs[0]?.value
            ? Number(inputs[0].value)
            : null,

        gols_visitante:
          inputs[1]?.value
            ? Number(inputs[1].value)
            : null,

        campo:
          td[4].textContent.trim(),

        data_hora:
          td[5].textContent.trim()

      });

    });

  return jogos;
}

// =====================================================
// POST
// =====================================================

async function postForm(document, alteracoes = {}) {

  const fields =
    getFormFields(document);

  // Aplica alterações
  Object.assign(
    fields,
    alteracoes
  );

  const body =
    new URLSearchParams(
      fields
    ).toString();

  const response =
    await fetch(URL, {

      method: "POST",

      headers: {
        ...headersGet(),

        "Content-Type":
          "application/x-www-form-urlencoded"
      },

      body

    });

  atualizarCookies(response);

  return await response.text();
}

// =====================================================
// MAIN
// =====================================================

(async () => {

  try {

    console.log(
      "▶ Iniciando scrape de jogos…"
    );

    // ===================================================
    // 1. GET INICIAL
    // ===================================================

    let response =
      await fetch(
        URL,
        {
          headers:
            headersGet()
        }
      );

    atualizarCookies(
      response
    );

    let html =
      await response.text();

    let document =
      getDocument(html);

    // ===================================================
    // 2. PROCURA O CAMPEONATO 180
    // ===================================================

    const select =
      document.querySelector(
        "#ctl00_MainContent_ddlCampeonato"
      );

    if (!select) {

      throw new Error(
        "❌ Select de campeonato não encontrado"
      );

    }

    const option180 =
      select.querySelector(
        `option[value="${CAMPEONATO_ID}"]`
      );

    if (!option180) {

      throw new Error(
        "❌ Campeonato 180 não encontrado"
      );

    }

    const campeonato =
      option180.textContent.trim();

    console.log(
      `🏆 Campeonato escolhido: ${campeonato}`
    );

    // ===================================================
    // 3. SELECIONA 180
    // ===================================================

    html =
      await postForm(
        document,
        {
          "ctl00$MainContent$ddlCampeonato":
            CAMPEONATO_ID,

          "ctl00$MainContent$btnSelecionar":
            "Selecionar",

          "__EVENTTARGET":
            "",

          "__EVENTARGUMENT":
            ""
        }
      );

    document =
      getDocument(html);

    // ===================================================
    // 4. CONFIRMA QUE ESTÁ NO 180
    // ===================================================

    const selectDepois =
      document.querySelector(
        "#ctl00_MainContent_ddlCampeonato"
      );

    const optionAtual =
      selectDepois?.querySelector(
        `option[value="${CAMPEONATO_ID}"][selected]`
      );

    const option180Depois =
      selectDepois?.querySelector(
        `option[value="${CAMPEONATO_ID}"]`
      );

    console.log(
      `🏆 Campeonato 180 encontrado: ${
        option180Depois
          ? "SIM"
          : "NÃO"
      }`
    );

    // ===================================================
    // IMPORTANTE
    //
    // Não confiamos somente no selected.
    // Conferimos também a tabela.
    // ===================================================

    if (!option180Depois) {

      throw new Error(
        "❌ O campeonato 180 desapareceu após a seleção"
      );

    }

    // ===================================================
    // 5. RODADA INICIAL
    // ===================================================

    let lblRodada =
      getRodada(document);

    if (!lblRodada) {

      throw new Error(
        "❌ Rodada não encontrada após selecionar o campeonato"
      );

    }

    let rodadaAtual =
      getNumeroRodada(
        lblRodada
      );

    const totalRodadas =
      getTotalRodadas(
        lblRodada
      );

    console.log(
      `📌 Site mostrou: ${lblRodada}`
    );

    // ===================================================
    // 6. GARANTE QUE COMEÇA NA RODADA 1
    //
    // O site normalmente abre na 1.
    // Se por algum motivo vier 2, 3 etc.,
    // usamos Button1 até chegar na 1.
    // ===================================================

    while (
      rodadaAtual > 1
    ) {

      console.log(
        `⬅ Voltando para Rodada 1... atual: ${rodadaAtual}`
      );

      html =
        await postForm(
          document,
          {
            "__EVENTTARGET":
              "ctl00$MainContent$Button1",

            "__EVENTARGUMENT":
              "",

            "ctl00$MainContent$ddlCampeonato":
              CAMPEONATO_ID
          }
        );

      document =
        getDocument(html);

      // Confirma campeonato
      const selectVolta =
        document.querySelector(
          "#ctl00_MainContent_ddlCampeonato"
        );

      const optVolta =
        selectVolta?.querySelector(
          `option[value="${CAMPEONATO_ID}"]`
        );

      if (!optVolta) {

        throw new Error(
          "❌ Campeonato mudou ao voltar rodada"
        );

      }

      lblRodada =
        getRodada(document);

      rodadaAtual =
        getNumeroRodada(
          lblRodada
        );

      console.log(
        `   📌 Agora: ${lblRodada}`
      );

    }

    // ===================================================
    // 7. AGORA TEMOS RODADA 1
    // ===================================================

    if (
      rodadaAtual !== 1
    ) {

      throw new Error(
        `❌ Não foi possível posicionar na Rodada 1. Site mostrou: ${lblRodada}`
      );

    }

    console.log(
      "✅ Posicionado na Rodada 1"
    );

    // ===================================================
    // 8. LER TODAS AS RODADAS
    // ===================================================

    const rodadas = [];

    while (true) {

      // -----------------------------------------------
      // CONFIRMA CAMPEONATO
      // -----------------------------------------------

      const campeonatoAtual =
        getCampeonatoSelecionado(
          document
        );

      console.log(
        `🔎 Campeonato atual: ${
          campeonatoAtual?.id
        } - ${
          campeonatoAtual?.nome
        }`
      );

      if (
        !campeonatoAtual ||
        campeonatoAtual.id !==
          CAMPEONATO_ID
      ) {

        throw new Error(
          `❌ CAMPEONATO ERRADO! Esperado 180, encontrado ${
            campeonatoAtual?.id ||
            "desconhecido"
          }`
        );

      }

      // -----------------------------------------------
      // RODADA
      // -----------------------------------------------

      lblRodada =
        getRodada(document);

      const numero =
        getNumeroRodada(
          lblRodada
        );

      console.log(
        `➡ Lendo ${lblRodada}`
      );

      // -----------------------------------------------
      // JOGOS
      // -----------------------------------------------

      const jogos =
        parseJogos(document);

      console.log(
        `   ⚽ ${jogos.length} jogos encontrados`
      );

      rodadas.push({

        numero,

        nome:
          lblRodada,

        jogos

      });

      // -----------------------------------------------
      // ÚLTIMA RODADA
      // -----------------------------------------------

      if (
        numero >= totalRodadas
      ) {

        break;

      }

      // -----------------------------------------------
      // PRÓXIMA RODADA
      // -----------------------------------------------

      html =
        await postForm(
          document,
          {
            "__EVENTTARGET":
              "ctl00$MainContent$Button2",

            "__EVENTARGUMENT":
              "",

            "ctl00$MainContent$ddlCampeonato":
              CAMPEONATO_ID
          }
        );

      document =
        getDocument(html);

      // -----------------------------------------------
      // CONFIRMA RODADA
      // -----------------------------------------------

      const novaRodada =
        getRodada(document);

      console.log(
        `   ➡ Próxima: ${novaRodada}`
      );

      // -----------------------------------------------
      // CONFIRMA CAMPEONATO
      // -----------------------------------------------

      const campeonatoDepois =
        getCampeonatoSelecionado(
          document
        );

      if (
        !campeonatoDepois ||
        campeonatoDepois.id !==
          CAMPEONATO_ID
      ) {

        throw new Error(
          `❌ O site mudou para campeonato ${
            campeonatoDepois?.id ||
            "desconhecido"
          }`
        );

      }

    }

    // ===================================================
    // 9. CONFERE SE PEGOU TODAS
    // ===================================================

    const numeros =
      rodadas.map(
        r => r.numero
      );

    console.log(
      `📋 Rodadas capturadas: ${numeros.join(", ")}`
    );

    if (
      !numeros.includes(1)
    ) {

      throw new Error(
        "❌ RODADA 1 NÃO FOI CAPTURADA"
      );

    }

    // ===================================================
    // 10. JSON
    // ===================================================

    const output = {

      campeonato,

      campeonato_id:
        CAMPEONATO_ID,

      atualizado_em:
        new Date().toISOString(),

      rodada_atual:
        1,

      total_rodadas: totalRodadas,

      rodadas

    };

    // ===================================================
    // 11. SALVAR
    // ===================================================

    fs.mkdirSync(
      "sicred",
      {
        recursive: true
      }
    );

    fs.writeFileSync(

      "sicred/jogos.json",

      JSON.stringify(
        output,
        null,
        2
      ),

      "utf-8"

    );

    console.log("");
    console.log(
      "======================================"
    );

    console.log(
      "✅ SCRAPER FINALIZADO"
    );

    console.log(
      `🏆 ${campeonato}`
    );

    console.log(
      `🆔 Campeonato: ${CAMPEONATO_ID}`
    );

    console.log(
      `📋 Rodadas: ${rodadas.length}/${totalRodadas}`
    );

    console.log(
      `⚽ Jogos: ${
        rodadas.reduce(
          (total, rodada) =>
            total + rodada.jogos.length,
          0
        )
      }`
    );

    console.log(
      "======================================"
    );

  } catch (err) {

    console.error("");
    console.error(
      "❌ ERRO NO SCRAPER:"
    );

    console.error(
      err.message
    );

    process.exit(1);

  }

})();