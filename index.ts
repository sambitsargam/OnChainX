import 'dotenv/config'

import { getTools, type ToolBase } from '@goat-sdk/core'
import { sendETH } from '@goat-sdk/wallet-evm'
import { viem } from '@goat-sdk/wallet-viem'
import { Agent, type Capability } from '@openserv-labs/sdk'
import fs from 'node:fs'
import path from 'node:path'
import { MODE, USDC, erc20 } from "@goat-sdk/plugin-erc20";
import { ionic } from "@goat-sdk/plugin-ionic";
import { kim } from "@goat-sdk/plugin-kim";
import { createWalletClient, http, parseEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { mode} from 'viem/chains'
import { coingecko } from "@goat-sdk/plugin-coingecko";
import { modespray } from '@goat-sdk/plugin-modespray'
import { modeGovernance } from '@goat-sdk/plugin-mode-governance'
import { polymarket } from "@goat-sdk/plugin-polymarket";
import twilio from 'twilio'
import type { z } from 'zod'

if (!process.env.WALLET_PRIVATE_KEY) {
  throw new Error('WALLET_PRIVATE_KEY is not set')
}

if (!process.env.RPC_PROVIDER_URL) {
  throw new Error('RPC_PROVIDER_URL is not set')
}

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set')
}

if (!process.env.OPENSERV_API_KEY) {
  throw new Error('OPENSERV_API_KEY is not set')
}


if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_WHATSAPP_NUMBER) {
  throw new Error('Twilio credentials are not set')
}

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

const sendWhatsAppMessage = async (to: any, message: any) => {
  try {
    const response = await twilioClient.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${to}`,
      body: message
    })
    console.log('Message sent:', response.sid)
  } catch (error) {
    console.error('Error sending WhatsApp message:', error)
  }
}


// const erc20Plugin = erc20({
//   tokens: [
//     USDC,
//     {
//       name: 'OpenServ',
//       symbol: 'SERV',
//       decimals: 18,
//       chains: {
//         [mainnet.id]: {
//           contractAddress: '0x40e3d1A4B2C47d9AA61261F5606136ef73E28042'
//         }
//       }
//     },
//     {
//       name: 'Virtual Protocol',
//       symbol: 'VIRTUAL',
//       decimals: 18,
//       chains: {
//         [mainnet.id]: {
//           contractAddress: '0x44ff8620b8cA30902395A7bD3F2407e1A091BF73'
//         }
//       }
//     }
//   ]
// })

const account = privateKeyToAccount(process.env.WALLET_PRIVATE_KEY as `0x${string}`)

const walletClient = createWalletClient({
  account,
  transport: http(process.env.RPC_PROVIDER_URL),
  chain: mode
})

const goatAgent = new Agent({
  systemPrompt: fs.readFileSync(path.join(__dirname, './system.md'), 'utf8')
})

const toCapability = (tool: ToolBase) => {
  return {
    name: tool.name,
    description: tool.description,
    schema: tool.parameters,
    async run({ args }) {
      const response = await tool.execute(args)

      if (typeof response === 'object') {
        return JSON.stringify(response, null, 2)
      }

      console.log(response.toString())

      return response.toString()
    }
  } as Capability<typeof tool.parameters>
}

async function main() {
  const wallet = viem(walletClient)

  const tools = await getTools({
    wallet,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    plugins: [sendETH(), erc20({ tokens: [USDC, MODE] }), kim(), ionic(), coingecko({ apiKey: "CG-omKTqVxpPKToZaXWYBb8bCJJ" }), modespray(), modeGovernance(), polymarket({
      credentials: {
          key: process.env.POLYMARKET_API_KEY as string, // API key for Polymarket operations
          secret: process.env.POLYMARKET_SECRET as string, // API secret for authentication
          passphrase: process.env.POLYMARKET_PASSPHRASE as string, // API passphrase for security
      },
  }),],
  })

  

  // const address = wallet.getAddress()

  // // here we need to override the tools that need to be executed with the address
  // // to pass the address of the wallet to the tool
  // // otherwise gpt is hallucinating the address
  // const transferTool = tools.find(tool => tool.name === 'transfer')

  // if (transferTool) {
  //   transferTool.execute = async ({ args }) => {
  //     const amount = parseEther(args.amount)
  //     const tx = await walletClient.sendTransaction({
  //       to: args.to,
  //       value: amount
  //     })

  //     return `Transaction sent: ${tx}`
  //   }
  // }

  // const getBalanceTool = tools.find(tool => tool.name === 'get_balance')

  // if (getBalanceTool) {
  //   getBalanceTool.execute = async () => {
  //     const balance = await wallet.balanceOf(address)
  //     return `${balance.value} ${balance.symbol}`
  //   }
  // }

  // const getTokenBalanceTool = tools.find(tool => tool.name === 'get_token_balance')

  // if (getTokenBalanceTool) {
  //   const execute = getTokenBalanceTool.execute

  //   getTokenBalanceTool.execute = async args => {
  //     return execute({ ...args, wallet: address })
  //   }
  // }

  try {
    const capabilities = tools.map(toCapability) as [Capability<z.ZodTypeAny>, ...Capability<z.ZodTypeAny>[]]
   // console.log(capabilities)
    goatAgent.addCapabilities(capabilities)

    await goatAgent.start()
    // console.log
  } catch (error) {
    console.error(error)
  }
}

// lets write swap tool
// const Swap = async (args: { from: string, to: string, amount: string }) => {
//   const from = args.from
//   const to = args.to
//   const amount = args.amount  // amount in string
//   // get the balance of from
//   const fromBalance = await walletClient.balanceOf(from)
//   if (fromBalance.value < amount) {
//     return `Insufficient balance in ${from}`
//   }
//   // get the balance of to
//   const toBalance = await walletClient.balanceOf(to)
//   // send the amount from from to to
//   await walletClient.sendTransaction({
//     to: to,
//     value: amount
//   })
//   return `Sent ${amount} from ${from} to ${to}`
// }   


main()
