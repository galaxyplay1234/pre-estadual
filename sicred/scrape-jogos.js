const fs = require("fs");
const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");

const URL = "https://www.lchf.com.br/JogosCampeonato.aspx";

const CAMPEONATO_ID = "180";

const HEADERS = {
  "Content-Type": "application/x-www-form-urlencoded",
  "User-Agent": "Mozilla/5.0"
};

async function getPage(html) {
  const dom = new JSDOM(html);
  return dom.window.document;
}

function getHidden(document, name) {
  return document.querySelector(`input[name="${name}"]`)?.value || "";
}

function parseJogos(document) {
  const tabela = document.querySelector("table.point-table");

  if (!tabela) return [];

  const jogos = [];

  tabela.querySelectorAll("tr").forEach((tr, i) => {
    if (i === 0) return;

    const td = tr.querySelectorAll("td");

    if (td.length < 6) return;

    const inputs = td[2].querySelectorAll("input");

    jogos.push({
      mandante: td[1].textContent.trim(),

      visitante: td[3].textContent.trim(),

      gols_mandante: inputs[0]?.value
        ? Number(inputs[0].value)
        : null,

      gols_visitante: inputs[1]?.value
        ? Number(inputs[1].value)
        : null,

      campo: td[4].textContent.trim(),

      data_hora: td[5].textContent.trim()
    });
  });

  return jogos;
}

function getRodada(document) {
  return (
    document
      .querySelector("#ctl00_MainContent_lblRodada")
      ?.textContent.trim() || ""
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

(async () => {
  try {
    console.log("▶ Iniciando scrape de jogos…");

    // =====================================================
    // 1. GET INICIAL
    // =====================================================

    let res = await fetch(URL, {
      headers: HEADERS
    });

    let html = await res.text();

    let document = await getPage(html);

    // =====================================================
    // 2. LOCALIZA O CAMPEONATO 180
    // =====================================================

    const selectCampeonato = document.querySelector(
      "#ctl00_MainContent_ddlCampeonato"
    );

    if (!selectCampeonato) {
      throw new Error(
        "❌ Select de campeonato não encontrado"
      );
    }

    const campeonatoOption = selectCampeonato.querySelector(
      `option[value="${CAMPEONATO_ID}"]`
    );

    if (!campeonatoOption) {
      throw new Error(
        `❌ Campeonato ${CAMPEONATO_ID} não encontrado`
      );
    }

    const campeonato =
      campeonatoOption.textContent.trim();

    console.log(
      `🏆 Selecionando campeonato: ${campeonato}`
    );

    // =====================================================
    // 3. SELECIONA O CAMPEONATO 180
    // =====================================================

    const bodyCampeonato = new URLSearchParams({
      "__EVENTTARGET": "",
      "__EVENTARGUMENT": "",

      "__VIEWSTATE": getHidden(
        document,
        "__VIEWSTATE"
      ),

      "__VIEWSTATEGENERATOR": getHidden(
        document,
        "__VIEWSTATEGENERATOR"
      ),

      "__EVENTVALIDATION": getHidden(
        document,
        "__EVENTVALIDATION"
      ),

      "ctl00$MainContent$ddlCampeonato":
        CAMPEONATO_ID,

      "ctl00$MainContent$btnSelecionar":
        "Selecionar"
    }).toString();

    res = await fetch(URL, {
      method: "POST",
      headers: HEADERS,
      body: bodyCampeonato
    });

    html = await res.text();

    document = await getPage(html);

    // =====================================================
    // 4. CONFIRMA CAMPEONATO
    // =====================================================

    const selectDepois = document.querySelector(
      "#ctl00_MainContent_ddlCampeonato"
    );

    const opcaoDepois =
      selectDepois?.querySelector(
        `option[value="${CAMPEONATO_ID}"]`
      );

    const campeonatoCarregado =
      opcaoDepois?.textContent.trim() || campeonato;

    console.log(
      `✅ Campeonato carregado: ${campeonatoCarregado}`
    );

    // =====================================================
    // 5. DESCOBRE A RODADA QUE O SITE ESTÁ MOSTRANDO
    // =====================================================

    let lblRodada = getRodada(document);

    if (!lblRodada) {
      throw new Error(
        "❌ Rodada não encontrada na página"
      );
    }

    let rodadaAtual =
      getNumeroRodada(lblRodada);

    const totalRodadas =
      getTotalRodadas(lblRodada);
      
    const rodadaInicial = rodadaAtual;

console.log(`📌 Rodada inicial do site: ${rodadaInicial}`);

    console.log(
      `📌 Rodada atual no site: ${lblRodada}`
    );

    console.log(
      `📌 Começando na Rodada ${rodadaAtual}`
    );

    console.log(
      `📌 Total de rodadas: ${totalRodadas}`
    );

    // =====================================================
    // 6. SE O SITE ESTIVER EM UMA RODADA DIFERENTE DE 1,
    //    VOLTA PARA A RODADA 1
    //
    //    Depois percorremos todas as rodadas.
    // =====================================================


    console.log(
      `📌 Scraper posicionado em: ${lblRodada}`
    );

    // =====================================================
    // 7. LER TODAS AS RODADAS
    // =====================================================

    const rodadas = [];

    for (
      let i = 1;
      i <= totalRodadas;
      i++
    ) {

      lblRodada = getRodada(document);

      const numeroRodada =
        getNumeroRodada(lblRodada);

      console.log(
        `➡ Lendo ${lblRodada}`
      );

      const jogos =
        parseJogos(document);

      console.log(
        `   ⚽ ${jogos.length} jogos encontrados`
      );

      rodadas.push({
        numero: numeroRodada,
        nome: lblRodada,
        jogos
      });

      // ===================================================
      // SE FOR A ÚLTIMA RODADA, PARA
      // ===================================================

      if (numeroRodada >= totalRodadas) {
        break;
      }

      // ===================================================
      // AVANÇA PARA A PRÓXIMA RODADA
      // ===================================================

      const bodyProxima = new URLSearchParams({

        "__EVENTTARGET":
          "ctl00$MainContent$Button2",

        "__EVENTARGUMENT": "",

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

      }).toString();

      res = await fetch(URL, {
        method: "POST",
        headers: HEADERS,
        body: bodyProxima
      });

      html = await res.text();

      document = await getPage(html);

      // Pequena confirmação
      const novaRodada =
        getRodada(document);

      console.log(
        `   ➡ Site agora está em: ${novaRodada}`
      );
    }

    // =====================================================
    // 8. SALVAR JSON
    // =====================================================

    const output = {
      campeonato: campeonatoCarregado,

      campeonato_id: CAMPEONATO_ID,

      atualizado_em:
        new Date().toISOString(),

      rodada_atual: rodadaInicial,

      total_rodadas:
        totalRodadas,

      rodadas
    };

    // Garante que a pasta exista
    fs.mkdirSync(
      "sicred",
      { recursive: true }
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

    console.log(
      "✅ jogos.json gerado com TODAS as rodadas"
    );

    console.log(
      `🏆 Campeonato: ${campeonatoCarregado}`
    );

    console.log(
      `📋 Rodadas salvas: ${rodadas.length}`
    );

  } catch (err) {

    console.error(
      "❌ Erro no scraper de jogos:",
      err.message
    );

    process.exit(1);
  }
})();