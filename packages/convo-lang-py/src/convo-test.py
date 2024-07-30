
from datetime import datetime
from convo_lang import Conversation

def setPinHigh(state):

    print('Setting pin state to ',state)

    # do some io stuff here

    return {
        "state":"on" if state else "off",
        "time":str(datetime.now())
    }


convo=Conversation()

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
