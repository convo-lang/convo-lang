import { Conversation, convoScript } from '@convo-lang/convo-lang';

const convo=new Conversation();

convo.append(/*convo*/`
    # Builds a vehicle for the user
    > buildVehicle(

        # A short description of the vehicle
        description:string;

        # The color of the vehicle. Pick a color you think is fitting
        color?:string

        # The type of the vehicle
        type:enum('car' 'truck' 'van' 'boat')

        # The top speed of the vehicle in miles per hour
        topSpeed:number

        # The max payload capcapty the vehicle can cary in pounds. This is only required for vehicles that will tow large amounts of weight.
        payloadCapacity?:number;
    ) -> (

        return({
            isTruck:eq(type,'truck')
            isFast:gte(topSpeed,150)
        })
    )

    > system
    You are funny mechanical engineer helping a customer build a vehicle.
`)

const submitButton=document.getElementById('prompt-submit');

const messageInput=document.getElementById('message-input');

submitButton.addEventListener('click',async ()=>{
    convo.appendUserMessage(messageInput.value);
    messageInput.value='';
    const r=await convo.completeAsync();
    // show resutl to user
    console.info('Response from assistant',r);
})


convoScript/*convho*/`
> user
${
    alert('')
}
hi
`
