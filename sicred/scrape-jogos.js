const fs = require("fs");
const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");

const URL = "https://www.lchf.com.br/JogosCampeonato.aspx";

// =====================================================
// CAMPEONATO NDTV
// =====================================================

const CAMPEONATO_ID = "180";

// =====================================================
// HEADERS
// =====================================================

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36",

  "Content-Type":
    "application/x-www-form-urlencoded",

  "Accept":
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

  "Referer":
    URL
};

// =====================================================
// COOKIE
// =====================================================

let cookies = "";

function atualizarCookies(response) {
  const setCookie = response.headers.raw()["set-cookie"];

  if (!setCookie) return;

  const novosCookies = setCookie
    .map(cookie => cookie.split(";")[0])
    .join("; ");

  if (!cookies) {
    cookies = novosCookies;
  } else {
    cookies = cookies + "; " + novosCookies;
  }
}

function headersComCookie() {
  return {
    ...HEADERS,
    Cookie: cookies
  };
}

// =====================================================
// DOM
// =====================================================

async function getPage(html) {
  const dom = new JSDOM(html);
  return dom.window.document;
}

// =====================================================
// HIDDEN INPUT
// =====================================================

function getHidden(document, name) {
  return (
    document.querySelector(`input[name="${name}"]`)?.value || ""
  );
}

// =====================================================
// RODADA
// =====================================================

function getRodada(document) {
  return (
    document
      .querySelector("#ctl00_MainContent_lblRodada")
      ?.textContent
      .trim() || ""
  );
}

function getNumeroRodada(lblRodada) {
  return Number(
    lblRodada.match(/Rodada\s+(\d+)/)?.[1] || 1
  );
}

function getTotalRodadas(lblRodada) {
  return Number(
    lblRodada.match(/de\s+(\d+)/)?.[1] || 1
  );
}

// =====================================================
// CAMPEONATO ATUAL
// =====================================================

function getCampeonatoSelecionado(document) {

  const select =
    document.querySelector(
      "#ctl00_MainContent_ddlCampeonato"
    );

  if (!select) return null;

  const option =
    select.querySelector("option:checked") ||
    select.querySelector("option[selected]");

  if (!option) return null;

  return {
    id: option.value,
    nome: option.textContent.trim()
  };
}

// =====================================================
// PARSER DOS JOGOS
// =====================================================

function parseJogos(document) {

  const tabela =
    document.querySelector("table.point-table");

  if (!tabela) {
    return [];
  }

  const jogos = [];

  tabela.querySelectorAll("tr").forEach((tr, i) => {

    if (i === 0) return;

    const td = tr.querySelectorAll("td");

    if (td.length < 6) return;

    const inputs =
      td[2].querySelectorAll("input");

    const mandante =
      td[1].textContent.trim();

    const visitante =
      td[3].textContent.trim();

    const campo =
      td[4].textContent.trim();

    const data_hora =
      td[5].textContent.trim();

    // Evita linhas vazias
    if (!mandante && !visitante) return;

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

      campo,

      data_hora

    });

  });

  return jogos;
}

// =====================================================
// MONTA CAMPOS HIDDEN
// =====================================================

function camposBase(document) {

  return {

    "__VIEWSTATE":
      getHidden(
        document,
        "__VIEWSTATE"
      ),

    "__VIEWSTATEGENERATOR":
      getHidden(
        document,
        "__VIEWSTATEGENERATOR"
      ),

    "__EVENTVALIDATION":
      getHidden(
        document,
        "__EVENTVALIDATION"
      ),

    "ctl00$MainContent$ddlCampeonato":
      CAMPEONATO_ID
  };
}

// =====================================================
// POST
// =====================================================

async function postPagina(body) {

  const response =
    await fetch(URL, {

      method: "POST",

      headers:
        headersComCookie(),

      body:
        body.toString()

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

    let res =
      await fetch(URL, {
        headers: headersComCookie()
      });

    atualizarCookies(res);

    let html =
      await res.text();

    let document =
      await getPage(html);

    // ===================================================
    // 2. PROCURA CAMPEONATO 180
    // ===================================================

    const selectCampeonato =
      document.querySelector(
        "#ctl00_MainContent_ddlCampeonato"
      );

    if (!selectCampeonato) {

      throw new Error(
        "❌ Select de campeonato não encontrado"
      );

    }

    const opcao =
      selectCampeonato.querySelector(
        `option[value="${CAMPEONATO_ID}"]`
      );

    if (!opcao) {

      throw new Error(
        `❌ Campeonato ${CAMPEONATO_ID} não encontrado`
      );

    }

    const campeonato =
      opcao.textContent.trim();

    console.log(
      `🏆 Campeonato desejado: ${campeonato}`
    );

    // ===================================================
    // 3. SELECIONA O CAMPEONATO 180
    // ===================================================

    const bodyCampeonato =
      new URLSearchParams({

        ...camposBase(document),

        "__EVENTTARGET": "",

        "__EVENTARGUMENT": "",

        "ctl00$MainContent$ddlCampeonato":
          CAMPEONATO_ID,

        "ctl00$MainContent$btnSelecionar":
          "Selecionar"

      });

    html =
      await postPagina(
        bodyCampeonato
      );

    document =
      await getPage(html);

    // ===================================================
    // 4. CONFIRMA CAMPEONATO
    // ===================================================

    const campeonatoAtual =
      getCampeonatoSelecionado(
        document
      );

    console.log(
      `🏆 Campeonato após seleção: ${
        campeonatoAtual?.id
      } - ${
        campeonatoAtual?.nome
      }`
    );

    // ===================================================
    // PROTEÇÃO
    // ===================================================

    if (
      !campeonatoAtual ||
      campeonatoAtual.id !== CAMPEONATO_ID
    ) {

      throw new Error(
        `❌ O site não permaneceu no campeonato ${CAMPEONATO_ID}`
      );

    }

    // ===================================================
    // 5. DESCOBRE A RODADA QUE O SITE MOSTROU
    // ===================================================

    let lblRodada =
      getRodada(document);

    if (!lblRodada) {

      throw new Error(
        "❌ Rodada não encontrada"
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
      `📌 Site está mostrando: ${lblRodada}`
    );

    console.log(
      `📌 Total de rodadas: ${totalRodadas}`
    );

    // ===================================================
    // IMPORTANTE:
    //
    // NÃO força rodada 1.
    //
    // Começa exatamente na rodada que
    // o site mostrou.
    // ===================================================

    const rodadaInicial =
      rodadaAtual;

    const rodadas = [];

    // ===================================================
    // 6. LOOP DAS RODADAS
    // ===================================================

    while (true) {

      // Confirma campeonato antes de
      // processar cada rodada

      const campeonatoLoop =
        getCampeonatoSelecionado(
          document
        );

      if (
        !campeonatoLoop ||
        campeonatoLoop.id !== CAMPEONATO_ID
      ) {

        throw new Error(
          `❌ Campeonato mudou durante o scrape: ${
            campeonatoLoop?.id || "desconhecido"
          }`
        );

      }

      lblRodada =
        getRodada(document);

      const numeroRodada =
        getNumeroRodada(
          lblRodada
        );

      console.log(
        `➡ Lendo ${lblRodada}`
      );

      const jogos =
        parseJogos(document);

      console.log(
        `   ⚽ ${jogos.length} jogos encontrados`
      );

      rodadas.push({

        numero:
          numeroRodada,

        nome:
          lblRodada,

        jogos

      });

      // =================================================
      // SE CHEGOU NA ÚLTIMA
      // =================================================

      if (
        numeroRodada >= totalRodadas
      ) {

        break;

      }

      // =================================================
      // 7. AVANÇA PARA A PRÓXIMA
      // =================================================

      const bodyProxima =
        new URLSearchParams({

          ...camposBase(document),

          "__EVENTTARGET":
            "ctl00$MainContent$Button2",

          "__EVENTARGUMENT":
            "",

          "ctl00$MainContent$ddlCampeonato":
            CAMPEONATO_ID

        });

      html =
        await postPagina(
          bodyProxima
        );

      document =
        await getPage(html);

      // =================================================
      // CONFIRMA CAMPEONATO APÓS POST
      // =================================================

      const campeonatoDepois =
        getCampeonatoSelecionado(
          document
        );

      if (
        !campeonatoDepois ||
        campeonatoDepois.id !== CAMPEONATO_ID
      ) {

        throw new Error(
          `❌ Após avançar a rodada, o site mudou para outro campeonato: ${
            campeonatoDepois?.id || "desconhecido"
          }`
        );

      }

      const novaRodada =
        getRodada(document);

      console.log(
        `   ➡ Agora no site: ${novaRodada}`
      );

    }

    // ===================================================
    // 8. JSON
    // ===================================================

    const output = {

      campeonato:
        campeonato,

      campeonato_id:
        CAMPEONATO_ID,

      atualizado_em:
        new Date().toISOString(),

      rodada_atual:
        rodadaInicial,

      total_rodadas:
        totalRodadas,

      rodadas

    };

    // ===================================================
    // 9. SALVA
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
      "✅ jogos.json gerado com sucesso"
    );

    console.log(
      `🏆 Campeonato: ${campeonato}`
    );

    console.log(
      `🆔 ID: ${CAMPEONATO_ID}`
    );

    console.log(
      `📋 Rodadas salvas: ${rodadas.length}`
    );

    console.log(
      `📌 Rodada inicial: ${rodadaInicial}`
    );

    console.log(
      "======================================"
    );

  } catch (err) {

    console.error("");
    console.error(
      "❌ Erro no scraper de jogos:",
      err.message
    );

    process.exit(1);

  }

})();