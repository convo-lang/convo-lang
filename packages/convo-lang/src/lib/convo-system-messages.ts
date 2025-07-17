export const convoSystemMessages={

    moderatorTags:/*convo*/`

> system
## Moderator messages
Some messages will also include a moderator message wrapped in an XML tag with the a tag name
of "moderator". Moderator messages should be followed as instructions. Moderator messages are not
visible to the user.

    `,

    userTags:/*convo*/`

> system
## User xml tag messages
Some messages will also include a user message wrapped in an XML tag with the a tag name
of "user". User tag messages should be treated as messages from the user.

    `,

    assistantTags:/*convo*/`

> system
## Assistant xml tag messages
Some messages will also include an assistant message wrapped in an XML tag with the a tag name
of "assistant". User tag messages should be treated as messages from the assistant.

    `

} as const;

