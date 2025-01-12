import chalk from 'chalk';
import { performance } from 'perf_hooks';
import * as readline from 'readline';

const url = "https://telegram.hypurr.fun/hypurr.Telegram/HyperliquidLaunchTrade";
const headers = {
  "accept": "application/grpc-web-text",
  "content-type": "application/grpc-web-text",
  "x-grpc-web": "1",
};

const successMessages = {
  buy: "Bought", // Mensaje de éxito para comprar
  sell: "Sold",  // Mensaje de éxito para vender
};
const insufficientBalanceMessage = "Insufficient balance"; // Mensaje de saldo insuficiente

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Crear interfaz para la entrada por la terminal
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askForMode = (): Promise<"buy" | "sell"> =>
  new Promise((resolve) => {
    rl.question(
      chalk.cyan("¿Qué deseas hacer? (buy/sell) [default: buy]: "),
      (mode) => {
        if (mode.trim() === "" || mode === "buy" || mode === "sell") {
          resolve(mode.trim() === "sell" ? "sell" : "buy");
        } else {
          console.log(chalk.red("Opción inválida. Por favor, escribe 'buy' o 'sell'."));
          resolve(askForMode());
        }
      }
    );
  });

const askForBody = (): Promise<string> =>
  new Promise((resolve) => {
    rl.question(chalk.cyan("Ingresa el contenido del body para la petición: "), (body) => {
      if (!body || body.trim() === "") {
        console.log(chalk.red("El body no puede estar vacío. Por favor, inténtalo de nuevo."));
        resolve(askForBody());
      } else {
        resolve(body);
        rl.close();
      }
    });
  });

async function sendRequestUntilSuccess (): Promise<void> {
  const mode = await askForMode();
  const body = await askForBody();
  const successMessage = successMessages[mode];
  let attempts = 0;
  let failedAttempts = 0;

  const startTime = performance.now(); // Tiempo de inicio del script

  while (true) {
    attempts++;
    const requestStartTime = performance.now(); // Tiempo de inicio de la petición

    try {
      const response = await fetch(url, { method: "POST", headers, body });
      const base64Response = await response.text();
      const decodedResponse = decodeAndCleanResponse(base64Response);

      const requestEndTime = performance.now(); // Tiempo de fin de la petición
      const latency = (requestEndTime - requestStartTime).toFixed(3); // Latencia de la petición

      console.log(
        chalk.yellow(`Intento ${attempts}:`) +
        ` Latencia: ${chalk.blue(latency)} ms - Respuesta: ${decodedResponse}`
      );

      if (decodedResponse.includes(successMessage)) {
        const totalTime = (performance.now() - startTime).toFixed(3); // Tiempo total desde el inicio del script
        console.log(chalk.green(`\n¡Operación exitosa (${mode}) encontrada!`));
        console.log(chalk.green(decodedResponse));
        console.log(chalk.blue(`Tiempo total: ${totalTime} ms`));
        console.log(chalk.blue(`Intentos realizados: ${attempts}`));
        break;
      }

      if (decodedResponse.includes(insufficientBalanceMessage)) {
        console.log(chalk.red("\nSaldo insuficiente detectado. Deteniendo el proceso."));
        break;
      }

      failedAttempts++;
      if (failedAttempts >= 5) {
        console.log(chalk.magenta("\n5 intentos fallidos detectados. Esperando 1.5 segundos..."));
        await pause(1500);
        failedAttempts = 0;
      } else {
        await pause(500); // Pausa normal entre intentos
      }
    } catch (error) {
      console.error(chalk.red(`Error en el intento ${attempts}:`), chalk.red((error as Error).message));
      await pause(500); // Pausa adicional en caso de error
    }
  }
}

function decodeAndCleanResponse (base64String: string): string {
  try {
    return Buffer.from(base64String, "base64")
      .toString("utf-8")
      .replace(/[\x00-\x1F\x7F-\x9F]|[^\x20-\x7E]/g, "") // Remueve caracteres no válidos
      .trim();
  } catch {
    return "";
  }
}

// Ejecutar el programa
sendRequestUntilSuccess();
