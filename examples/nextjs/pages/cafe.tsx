import { Icon } from "@/components/icon/Icon";
import { staticContent } from "@/lib/static-site-content";
import { atDotCss } from "@iyio/at-dot-css";
import { ScrollView, SlimButton, View } from "@iyio/react-common";
import { useState } from "react";
import { AgentView } from "../components/AgentView";

interface MenuItem
{
    id:number;
    name:string;
    price:number;
}

interface OrderItem extends MenuItem{
    quantity:number;
    modifications?:string;
}

const menu:MenuItem[]=[
    {id:1,name:'apple-pie',price:5},
    {id:2,name:'taco',price:7},
    {id:3,name:'baguette',price:3},
    {id:4,name:'bacon',price:2},
    {id:5,name:'burger',price:8},
    {id:6,name:'burrito',price:8},
    {id:7,name:'bagel',price:3},
    {id:8,name:'cheesecake',price:4},
    {id:9,name:'cookies',price:5},
    {id:10,name:'chocolate-cake',price:7},
    {id:11,name:'curry',price:8},
    {id:12,name:'donut',price:3},
    {id:13,name:'dumplings',price:4},
    {id:14,name:'french-fries',price:2},
    {id:15,name:'fruitcake',price:7},
    {id:16,name:'garlic-bread',price:4},
    {id:17,name:'giant-gummy-bear',price:8},
    {id:18,name:'ginger-bread-man',price:8},
    {id:19,name:'hotdog',price:4},
    {id:20,name:'lemon-pie',price:7},
    {id:21,name:'mac-n-cheese',price:8},
    {id:22,name:'meatballs',price:10},
    {id:23,name:'nacho',price:6},
    {id:24,name:'omelet',price:9},
    {id:25,name:'pudding',price:3},
    {id:26,name:'pancakes',price:5},
    {id:27,name:'pizza',price:12},
    {id:28,name:'roasted-chicken',price:17},
    {id:29,name:'salmon',price:16},
    {id:30,name:'strawberry-cake',price:8},
    {id:31,name:'steak',price:20},
    {id:32,name:'sushi',price:20},
    {id:33,name:'waffle',price:6},
]


// For syntax highlighting of Convo-Lang install the Convo-Lang VSCode extension.
// Search for "convo-lang" in the extensions window.
const convoScript=/*convo*/`

> define
dinerName="Mornings with Mary"
waiterName="Mary"

> system
You are a server at a small cafe called "{{dinerName}}".
You are friendly but very sarcastic.

Here is the menu for the dinner:
<menu>
id, name, price
${menu.map(m=>`${m.id}, ${m.name}, $${m.price}`).join('\n')}
</menu>

# Adds an item to the customer's order
> extern orderMenuItem(

    # Id of the item to order
    id:number

    # Any modifications the customer to the item the
    # customer asks for
    modifications?:string
)

# Removes an item from the customer's order
> extern removeMenuItem(

    # Id of the item to remove
    id:number
)

# Removes all items the customer has added to their order
> extern cancelOrder()

# Show the full menu to the customer
> extern showMenu()

# hides the the menu for the customer
> extern hideMenu()

# submits customer feedback
> submitFeedback(
    # The general sentiment of the feedback from the customer
    sentiment:enum( "positive" "neutral" "negative")
    # The customers feedback
    feedback:string
) -> (
    // posts the feed back to the /api/dinner-feedback endpoint
    httpPost(
        "/api/diner-feedback"
        // __args is an object that contains all the arguments passed to the function
        __args
    )
    showToast('Feedback submitted: {{sentiment}}\\n\\n{{feedback}}')
    return("Feedback submitted")
)

> assistant
Welcome to "{{dinerName}}", you ready to order 😁

@suggestion
> assistant
Whats on the menu?

@suggestion
> assistant
I would like a pizza

@suggestion
> assistant
Can you show me the menu?

@suggestion
> assistant
Tell the chief my food was great
`;



export default function Cafe(){



    const [order,setOrder]=useState<OrderItem[]>([]);
    const total=order.reduce((t,m)=>t+m.price*m.quantity,0);
    const orderMenuItem=(id:number,modifications?:string)=>{
        const item=menu.find(m=>m.id===id);
        if(!item){
            return `No menu item found with id ${id}`
        }
        const existing=order.find(i=>i.id===id);
        if(existing){
            existing.quantity++;
            if(modifications){
                existing.modifications=modifications;
            }
            setOrder([...order]);
            return `Added another ${item.name} to order`;
        }
        setMenuOpen(false);
        setOrder([...order,{...item,quantity:1,modifications}]);
        return `${item.name} added to order`;
    }
    const removeMenuItem=(id:number)=>{
        const item=menu.find(m=>m.id===id);
        if(!item){
            return `No menu item found with id ${id}`
        }
        if(!order.some(m=>m.id===id)){
            return `The customer has not ordered ${item.name} yet`
        }
        setOrder(order.filter(m=>m.id!==id));
        return `${item.name} removed from order`
    }
    const cancelOrder=()=>{
        setOrder([]);
        return 'All items removed from order';
    }



    const [menuOpen,setMenuOpen]=useState(false);
    const showMenu=()=>{
        setMenuOpen(true);
        return "Menu shown to customer"
    }
    const hideMenu=()=>{
        setMenuOpen(false);
        return "Menu hidden from customer"
    }



    const [toast,setToast]=useState('');
    const [toastOpen,setToastOpen]=useState(false);
    const showToast=(message:string)=>{
        setToast(message);
        setToastOpen(true);
        setTimeout(()=>setToastOpen(false),5000);
    }


    
    return (
        <AgentView
            convoScript={convoScript}
            externFunctions={{
                orderMenuItem,
                removeMenuItem,
                cancelOrder,
                showMenu,
                hideMenu,
                showToast
            }}
            defaultVars={{staticContent}}
        >
            <div className={style.root()}>
                <div className={style.container()}>
                    <img className={style.bg()} src="/food/diner.png"/>
                    {order.map((item,i)=>(
                        <img
                            key={item.id}
                            className={style.item()}
                            src={`/food/${item.name}.png`}
                            style={{
                                transform:`translateY(${i*-25}%)`}}
                        />
                    ))}
                </div>

                <View absBottomRight m1 row alignCenter g050 className={style.total()}><label>Total</label> ${total.toLocaleString()}</View>

                <View absFill className={style.menuBg({menuOpen})}/>

                <View absFill col className={style.menuContainer({menuOpen})}>
                    <ScrollView flex1 containerClassName={style.scrollContainer()}>
                        <div className={style.menu()}>
                            <h1>Menu</h1>
                            {menu.map(m=>(
                                <View key={m.id} row justifyBetween className={style.menuItem()}>
                                    <span>{m.name.replace(nameReg,(_,s:string,char:string)=>`${s?' ':''}${char.toUpperCase()}`)}</span>
                                    <strong>${m.price}</strong>
                                </View>
                            ))}
                        </div>
                    </ScrollView>
                    <SlimButton absTopRight m050 p1 onClick={()=>setMenuOpen(false)}>
                        <Icon icon="x" color="#999" size={20}/>
                    </SlimButton>
                </View>

                <div className={style.toast({toastOpen})}>
                    {toast}
                </div>
            </div>

        </AgentView>
    );
}

const nameReg=/(^|-)(\w)/g;

// For syntax highlighting of at-dot-css install the "high-js" VSCode extension.
const style=atDotCss({name:'Cafe',css:`
    @.root{
        display:flex;
        flex-direction:column;
        flex:1;
        justify-content:center;
        padding:2rem;
    }
    @.container{
        position:relative;
        max-width:640px;
        margin:0 auto;
    }
    @.bg{
        width:100%;
    }
    @.item{
        position:absolute;
        left:33%;
        top:60%;
        width:6%;
    }
    @.menuBg{
        background-color:#00000000;
        visibility:hidden;
        transition:
            background-color 0.4s ease-in-out,
            visibility 0.4s ease-in-out;
    }
    @.menuBg.menuOpen{
        background-color:#00000066;
        visibility:visible;
    }
    @.menuContainer{
        transform:translateY(100%);
        visibility:hidden;
        transition:
            transform 0.4s ease-in-out,
            visibility 0.4s ease-in-out;
    }
    @.menuContainer.menuOpen{
        visibility:visible;
        transform:translateY(0);
    }
    @.scrollContainer{
        display:flex;
        justify-content:center;
    }
    @.menu{
        flex:1;
        max-width:500px;
        margin:2rem;
        background-color:#DEC193;
        border-radius:32px;
        padding:2rem;
        gap:1rem;
        display:flex;
        flex-direction:column;
        color:#333;
    }
    @.menuItem{
        font-size:1.5rem;
        border-bottom:1px solid #777;
        padding-bottom:0.2rem;
    }
    @.total{
        font-size:18px;
        font-weight:bold;
        padding:0.5rem 0.7rem;
        border:1px solid #444;
        border-radius:8px;
        background:#0A0A0A;
    }
    @.toast{
        position:absolute;
        left:50%;
        top:1rem;
        transform:translate(-50%,calc( -120% - 2rem ));
        transition:transform 0.2s ease-in-out;
        background:#5C92F1;
        border-radius:16px;
        border:1px solid #444;
        padding:0.5rem 1rem;
        max-width:400px;
        font-weight:bold;
        white-space:pre-wrap;

    }
    @.toast.toastOpen{
        transform:translate(-50%,0);
    }
`});
