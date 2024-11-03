# Convo-Lang NextJs example

This is an example project using [Convo-Lang](https://learn.convo-lang.ai) in a NextJS application

![Convo-Lang NextJs example](https://github.com/convo-lang/convo-lang/blob/main/assets/convo-lang-nextjs-example.webp?raw=true)

If you want to learn the Convo-Lang language check out this tutorial  - [https://learn.convo-lang.ai/learn](https://learn.convo-lang.ai)

## Getting Started

1. Copy `example.env.development` to `.env.development`
2. Replace `OPENAI_API_KEY` value in `.env.development` with your OpenAI API key
3. Install dependencies, run `npm install`
4. Start the dev server, run `npm run dev`
5. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

**Frontend:**
Each page in this project is an example of an AI agent written in Convo-Lang and each page
uses the the AgentView component to display a chat window and a main content area that the 
agents interact with. The chat window is an example of using the `ConversationView` component from `@convo-lang/convo-lang-react`.

**Backend:**
Prompts submitted by the chat window are sent to the `/ap/convo-lang` endpoint which are then
forwarded to the OpenAI API using the api key defined in `.env.development`. The convo-lang
endpoint uses the `createConvoLangApiRoutes` function from `@convo-lang/convo-lang-api-routes` to create a NextJS API handler 
callback.

## Example Agents
- [Convo-Lang Teacher](http://localhost:3000) (Doc) - Teaches you about Convo-Lang
- [Fitness Trainer](http://localhost:3000/fitness-trainer) - Create fitness plans in markdown format
- [Retro Web Design](http://localhost:3000/retro-web) - Creates web pages form the early 2000's
- [My Room](http://localhost:3000/my-room) - A home automations agent
- [Cafe](http://localhost:3000/cafe) - A small cafe where you can order food

## Syntax Highlighting
This project makes heavy use of Convo-Lang embedded in TypeScript using template literals.

Install the "convo-lang" VSCode extension for Convo-Lang syntax highlighting.

https://marketplace.visualstudio.com/items?itemName=IYIO.convo-lang-tools


## Styling
This project uses [at-dot-css](https://github.com/iyioio/common/tree/main/packages/at-dot-css) for
styling. At-dot-css is a fast and lightweight css-in-js library for defining component styles.

Install the "high-js" VSCode extension for at-dot-css syntax highlighting.

https://marketplace.visualstudio.com/items?itemName=IYIO.high-js


## Links
- Learn Convo-Lang - https://learn.convo-lang.ai
- GitHub - https://github.com/convo-lang/convo-lang
- NPM - https://www.npmjs.com/package/@convo-lang/convo-lang


