const puppeteer = require("puppeteer");
console.log("done")
const chartinkUrl = "https://chartink.com/screener/test-2022-03-12-4";
let timeFrames = [
  { name: "hourly", timeFrame: "60_minute", range: "22" },
  { name: "daily", timeFrame: "d", range: "198" },
  { name: "weekly", timeFrame: "w", range: "504" },
];
let browser;
let page;
(async () => {
  browser = await puppeteer.launch({ headless: false });
  page = await browser.newPage();
  await page.goto(chartinkUrl);
  var stocksUrls = await scrapStocks();
  if (stocksUrls.length != 0) {
    await goToStockCharts(stocksUrls);
  }
  await browser.close();
})();

let goToStockCharts = async (stockUrls) => {
  try {
    for (var stockUrl of stockUrls) {
      await page.goto(stockUrl);
      //   await page._client.send("Page.setDownloadBehavior", {
      //     behavior: "allow",
      //     downloadPath: "./",
      //   });
      await setMovingAverages();

      for (var timeFrame of timeFrames) {
        await setTimeFrame(timeFrame);
        await page.click("#innerb");
        await page.waitFor(3000);
        const iFrame = await page
          .frames()
          .find((f) => f.name() === "ChartImage");
        await iFrame.waitForSelector("#saverbutton");
        const saveBtn = await iFrame.$("#saverbutton");
        await saveBtn.click();
        await page.waitFor(1000);
      }
    }
  } catch (err) {
    console.log(err);
  }
};

let setTimeFrame = async (inputTimeFrame) => {
  try {
    await page.$eval(
      "#d",
      (selectBox, timeFrame) => (selectBox.value = timeFrame),
      inputTimeFrame.timeFrame
    );
    await page.$eval(
      "#ti",
      (selectBox, range) => (selectBox.value = range),
      inputTimeFrame.range
    );
  } catch (err) {
    console.log(err);
  }
};

let setMovingAverages = async () => {
  const movingAverageRows = await page.$$("#moving_avgs tr:not(.limg)");
  for (var movingAverageRow = 0; movingAverageRow <= 2; movingAverageRow++) {
    await movingAverageRows[movingAverageRow].$eval(
      "td:first-child input",
      (checkbox) => (checkbox.checked = true)
    );
    await movingAverageRows[movingAverageRow].$eval(
      "td:nth-child(4) select",
      (selectBox) => (selectBox.value = "EMA")
    );

    let movingAverage =
      movingAverageRow == 0 ? 10 : movingAverageRow == 1 ? 20 : 50;

    await movingAverageRows[movingAverageRow].$eval(
      "td:nth-child(5) input",
      (textfield, movingAverage) => {
        textfield.value = movingAverage;
      },
      movingAverage
    );
  }
};
let scrapStocks = async () => {
  let loopCount = 0;
  let stocks = [];
  let nextBtnExist = await isNextPaginationExist();
  try {
    do {
      if (loopCount != 0) {
        await clickNextPagination();
        nextBtnExist = await isNextPaginationExist();
      }

      var urlsScrapped = await page.$$eval(
        ".scan_results_table tr td:nth-child(2) a",
        (aTags) => aTags.map((aTag) => aTag.href)
      );
      stocks = stocks.concat(urlsScrapped);
      loopCount++;
    } while (nextBtnExist);
    return stocks;
  } catch (err) {
    console.log(err);
  }
};

let clickNextPagination = () => {
  return page.click(
    "#DataTables_Table_0_paginate ul li:last-child:not(.disabled)"
  );
};
let isNextPaginationExist = async () => {
  return (
    (
      await page.$$(
        "#DataTables_Table_0_paginate ul li:last-child:not(.disabled)"
      )
    ).length != 0
  );
};
