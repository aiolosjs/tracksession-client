/* tslint:disable: no-console */

import * as fs from 'fs';
import * as path from 'path';
import * as EventEmitter from 'events';
import * as inquirer from 'inquirer';
import * as puppeteer from 'puppeteer';
const random_useragent = require('random-useragent');

const emitter = new EventEmitter();

function getCode(): string {
  const bundlePath = path.resolve(__dirname, '../dist/tracksession.min.js');
  return fs.readFileSync(bundlePath, 'utf8');
}

(async () => {
  const code = getCode();

  start();

  async function start() {
    const { url } = await inquirer.prompt<{ url: string }>([
      {
        type: 'input',
        name: 'url',
        message:
          'Enter the url you want to record, e.g https://react-redux.realworld.io: ',
      },
    ]);

    console.log(`Going to open ${url}...`);
    await record(url);
    console.log('Ready to record. You can do any interaction on the page.');

    const { shouldReplay } = await inquirer.prompt<{ shouldReplay: boolean }>([
      {
        type: 'confirm',
        name: 'shouldReplay',
        message: `Once you want to finish the recording, enter 'y' to start replay: `,
      },
    ]);

    emitter.emit('done', shouldReplay);

    const { shouldRecordAnother } = await inquirer.prompt<{
      shouldRecordAnother: boolean;
    }>([
      {
        type: 'confirm',
        name: 'shouldRecordAnother',
        message: 'Record another one?',
      },
    ]);

    if (shouldRecordAnother) {
      start();
    } else {
      process.exit();
    }
  }
  function randomNumber(lower: number, upper: number) {
    return Math.floor(Math.random() * (upper - lower)) + lower;
  }

  async function record(url: string) {
    // await getData();
    const browser = await puppeteer.launch({
      headless: false,
      devtools: true,
      // defaultViewport: {
      //   width: 1600,
      //   height: 900,
      // },
      defaultViewport: null,
      args: ['--start-maximized'],
    });

    const page = await browser.newPage();
    const ua = random_useragent.getRandom();
    await page.setUserAgent(ua);
    // await page.setViewport({
    //   width: 360,
    //   height: 760,
    //   isMobile: true,
    // });
    // await page.waitFor(2000);
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
    });

    // test userid

    // await page.evaluate(()=>{
    //   window.localStorage.setItem('tracksession--userid-28idBGwBwB1js3SOijiy','bBLkIWwBEv6dQT4OL0QL');
    // });

    await page.exposeFunction('_replLog', () => {
      // console.log('####')
    });
    await page.evaluate(`;
    window.trackSessionToken = "_gQd6nYBhv7Fx9UOOfSw"  ;
    ;${code}
    `);
    // page.on('framenavigated', async () => {
    //   const isRecording = await page.evaluate('window.__IS_RECORDING__');
    //   if (!isRecording) {
    //     await page.evaluate(`;${code}
    //       window.__IS_RECORDING__ = true
    //       rrweb.record({
    //         emit: event => window._replLog(event)
    //       });
    //     `);
    //   }
    // });

    emitter.once('done', async (shouldReplay) => {
      await browser.close();
    });
  }

  process
    .on('uncaughtException', (error) => {
      console.error(error);
    })
    .on('unhandledRejection', (error) => {
      console.error(error);
    });
})();
