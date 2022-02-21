const express = require("express");
const puppeteer = require("puppeteer");
const fs = require("fs");
const app = express();
var cors = require("cors");
const port = process.env.PORT || 4000;
const cron = require("node-cron");

cron.schedule("* 2 * * *", () => {
  console.log("Task is running daily at 8:30 " + new Date());
  scrapeData();
});
app.use(cors());
app.get("/", (err, res) => {
  res.status(200);
  var data = fs.readFileSync("data.json");
  var myObject = JSON.parse(data);
  res.json(myObject);
  res.end();
});

app.listen(port, (err) => {
  if (err) {
    throw err;
  }
  console.log("Node Endpoints working :)");
});

const scrapeData = async () => {
  let browser = await puppeteer.launch({ headless: false }); //headless:false so we can watch the browser as it works
  let page = await browser.newPage(); //open a new page
  await page.goto("https://www.mohfw.gov.in/"); //access the heathwebiste page

  const data = await page.evaluate(() => {
    const listItems = Array.from(
      document.querySelectorAll(
        "#site-dashboard > div > div > div:nth-child(1) > div.col-xs-8.site-stats-count > ul > li>strong"
      )
    );
    //extract the label and up/down class
    const temp = [];
    listItems.forEach(function (node) {
      let h = { label: "", value: "" };
      h.label = node.querySelector("span").className;
      h.value = node.innerText.replace(/\s+/, "");
      temp.push(h);
    });

    //prepare a response for api
    const covidData = [];
    for (let i = 0; i < temp.length; i = i + 2) {
      let resObj = {};
      resObj[temp[i].value] = temp[i + 1];
      covidData.push(resObj);
    }

    // --------------------------------------STATE DATA-------------

    const stateTable = [];
    document.querySelector(".trigger-state").click();
    const tableData = document
      .querySelector(".statetable")
      .querySelector("tbody");
    const rowData = tableData.querySelectorAll("tr");
    function stateData(arr) {
      (this.sno = arr[0]),
        (this.state_name = arr[1]),
        (this.new_active = arr[2]),
        (this.change_since_yesterday = arr[3]),
        (this.new_cured = arr[4]),
        (this.change_since_yesterday = arr[5]),
        (this.new_death = arr[6]),
        (this.death_during_day = arr[7]),
        (this.death_reconsille = arr[8]),
        (this.total = arr[9]);
    }
    rowData.forEach((row) => {
      let tdList = row.querySelectorAll("td");
      // let resObj = [];

      if (tdList.length >= 10) {
        tdList = Array.from(tdList).map((el) => el?.innerText.trim());
        stateTable.push(new stateData(tdList));
      } else stateTable.push(tdList[0].innerText.trim());

      // stateTable.push(resObj);
    });

    return { stateTable, covidData };
  });

  //   --------------------Write Scraped content to file-------------------------
  var newData = JSON.stringify(data);
  fs.writeFile("data.json", newData, (err) => {
    // Error checking
    if (err) throw err;
    console.log("New data added");
  });

  await browser.close();
};
