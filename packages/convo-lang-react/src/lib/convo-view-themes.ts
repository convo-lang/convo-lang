import { ConvoViewTheme } from "@convo-lang/convo-lang";
import { ArrowUpIcon, BrainIcon, DatabaseSearchIcon, EqualIcon, Loader2Icon, MemoryStickIcon, MenuIcon, UserIcon } from 'lucide-react';

export type ConvoViewThemeName='default';

export const getConvoViewTheme=(name:ConvoViewThemeName):ConvoViewTheme=>{

    switch(name){

        case 'default': default: return {
            convoViewClassName:'relative flex flex-col',
            iconClassName:'size-4 shrink-0 opacity-50',

            userIcon:UserIcon,
            assistantIcon:BrainIcon,
            userIconClassName:'mt-2 -mr-2',
            assistantIconClassName:'mt-2 -ml-2',

            markdownClassName:'prose dark:prose-invert',
            plainTextClassName:'whitespace-pre-line',

            messageListContainerClassName:'flex flex-col flex-1',
            messageListClassName:'flex flex-col gap-4 p-4',
            messageListContainerScrollDisabledClassName:'',
            scrollViewClassName:'flex-1',
            scrollContentClassName:'',

            messageClassName:'border p-3 rounded-xl',
            userMessageClassName:'',
            assistantMessageClassName:'',
            resultMessageClassName:'',
            ragMessageClassName:'bg-foreground text-background text-sm py-2 px-3 flex gap-1 items-center',
            systemMessageClassName:'font-mono text-sm whitespace-pre-line',
            systemIcon:MemoryStickIcon,
            callMessageClassName:'whitespace-pre-wrap',
            functionMessageClassName:'whitespace-pre-wrap',

            rowClassName:'flex items-start gap-2',
            userRowClassName:'justify-end ml-8',
            assistantRowClassName:'mr-8',
            resultRowClassName:'',
            ragRowClassName:'',
            systemRowClassName:'',
            callRowClassName:'',
            functionRowClassName:'',
            suggestionRowClassName:'',
            componentRowClassName:'',

            assignmentListClassName:'flex flex-col gap-2',
            assignmentSingleItemListClassName:'',
            assignmentRowClassName:'flex items-center gap-2',
            assignmentNameClassName:'',
            assignmentIconClassName:'',
            assignmentValueClassName:'',
            assignmentIcon:EqualIcon,
            imageClassName:'',
            userImageClassName:'',
            assistantImageClassName:'',

            statusIndicatorRowClassName:'',
            loaderIcon:Loader2Icon,
            loaderIconClassName:'animate-spin',

            inputSuggestionsContainerClassName:'flex flex-wrap gap-2 items-center',
            inputSuggestionButtonClassName:
                'text-left border rounded-full py-1 px-2 cursor-pointer flex bg-background '+
                'items-center gap-1 text-xs hover:bg-foreground/30 transition-[background-color]',

            inputAreaClassName:
                'absolute left-0 bottom-0 right-0 flex flex-col gap-2 pl-4 pb-4 pr-4 '+
                'bg-gradient-to-t from-background/100 to-background/0',
            inputContainerClassName:'relative flex items-center',
            inputContainerReadyClassName:'border-border',
            inputClassName:
                'flex-1 py-2 pl-4 pr-8 rounded-3xl outline-none '+
                'border border-border/50 bg-background '+
                'resize-none min-h-0 max-h-80 field-sizing-content '+
                'focus:border-border transition-[border-color]',
            inputReadyClassName:'border-border',
            inputSubmitButtonClassName:
                'absolute right-1.5 size-7 rounded-full bg-primary text-primary-foreground '+
                'flex justify-center items-center transition-opacity opacity-50',
            inputSubmitReadyButtonClassName:'opacity-100',
            inputSubmitButtonIcon:ArrowUpIcon,
            inputSubmitButtonIconClassName:'',

            inputImageClassName:'',

            suggestionContainerClassName:'flex flex-col pl-6',
            suggestionMessageClassName:'flex flex-col gap-1 border-none items-start p-0',
            suggestionTitleContainerClassName:'flex items-center gap-1 mb-1',
            suggestionTitleIcon:MenuIcon,
            suggestionTitleIconClassName:'size-3',
            suggestionTitleClassName:'text-foreground/50 text-xs',
            suggestionButtonClassName:
                'text-left border rounded-full py-1.5 pl-3 pr-4 cursor-pointer flex bg-background '+
                'items-center gap-1 text-sm hover:bg-foreground/30 transition-[background-color]',

            taskClassName:'',
            taskNameClassName:'',
            taskLinkClassName:'',
            taskProgressBarClassName:'',
            taskStatusClassName:'',
            taskRowClassName:'',

            ragIcon:DatabaseSearchIcon,
        };
    }

}
