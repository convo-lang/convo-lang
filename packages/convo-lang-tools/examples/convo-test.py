from datetime import datetime
from convo_lang import Conversation

convo=Conversation({
    # Can be omitted when using an apiBaseUrl that does not require an API key
    "apiKey":"YOUR_OPEN_AI_KEY",

    # Can be used to connect to OpenAi compatible APIs such as LMStudio - https://lmstudio.ai/
    #"apiBaseUrl":"http://localhost:1234/v1",

    # Sets the models that are allowed to be used. The first model will be the default
    "chatModel":"gpt-4-1106-preview,gpt-3.5-turbo-1106,gpt-3.5-turbo",

    # Sets the model that will be used for audio tasks. The first model will be the default.
    "audioModel":"whisper-1",

    # Sets the model that will be used to image generation. The first model will be the default.
    "imageModel":"dall-e-3",

    # Sets the model that will be used to implement vision capabilities. The first model will be the default.
    "visionModel":"gpt-4-vision-preview"
})


def setPinHigh(state):

    print('Setting pin state to ',state)

    # do some io stuff here

    return {
        "state":"on" if state else "off",
        "time":str(datetime.now())
    }

# adding setPinHigh to the conversation's callbacks allows setPinHigh to be called by functions
# defined in convo-lang
convo.callbacks['setPinHigh']=setPinHigh

convo.append(
"""*convo*
> define
//__model='gpt-3.5-turbo-1106'
__trackModel=true

# Turn the lights in the user's house on or off
> turnOnOffLights(
    # The state to set the lights to
    state: enum("on" "off")
) -> (

    // setPinHigh will call the setPinHigh function defined in python
    return(setPinHigh(eq(state "on")))
)

> system
You are a home automation assistant. please assistant the user to the best or your ability.

The current date and time is {{dateTime()}}

> user
It's time for bed, can you turn off the lights

""")

resultMessage=convo.completeAsync()

print('------ convo ------')
print(convo.convo)

print('\n\n------ messages ------')
print(convo.messages)

print('\n\n------ state ------')
print(convo.state)

print('\n\n------ syntaxMessages ------')
print(convo.syntaxMessages)

print('\n\n------ result ------')
print(resultMessage['content'])
