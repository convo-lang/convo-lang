from langchain.text_splitter import TextSplitter
from typing import Any, List

spaceChars=[' ','\n','\r','\t']

class ConvoTextSplitter(TextSplitter):
    """Splitting text that looks at characters."""

    def __init__(
        self,
        separator: str = "\n\n",
        overlapSep:str='',
        overlapGrow:int=-1,
        **kwargs: Any
    ) -> None:
        """Create a new TextSplitter."""
        super().__init__(**kwargs)
        self._separator = separator
        self._overlapSep=overlapSep
        self._overlapGrow=overlapGrow if overlapGrow >=0 else self._chunk_overlap

    def split_text(self, text: str) -> List[str]:
        """Split incoming text and return chunks."""


        parts=text.split(self._separator)
        i=0
        while i<len(parts):
            parts[i]=parts[i]+self._separator
            i=i+1

        size=self._chunk_size

        # Split chunks to large
        i=0
        while i<len(parts):

            part=parts[i]

            if len(part) > size:
                start=i
                lines=splitOn(part,['\n'],size)

                parts.pop(i)

                for p in lines:
                    parts.insert(i,p)
                    i=i+1
                i=i-1

                # rejoin smaller chunks
                x=start
                while x<i:
                    part=parts[x]
                    while x+1<i and len(part+parts[x+1]) <= size:
                        part=part+parts[x+1]
                        parts.pop(x+1)
                        i=i-1
                    parts[x]=part
                    x=x+1

            i=i+1


        # Add overlap
        if self._chunk_overlap:
            overlap=self._chunk_overlap
            overlapSep=self._overlapSep
            overlapGrow=self._overlapGrow
            i=0
            pLen=len(parts)
            pLenN1=pLen-1
            prevUpdate=parts[0]
            while i<pLen:
                prev=parts[i-1] if i else ''
                if prev:
                    prevLen=len(prev)
                    prevI=prevLen-overlap
                    if prevI < 0:
                        prevI=0

                    prevInit=prev[prevI:prevLen]
                    prevI=prevI-1
                    added=0
                    while prevI>=0 and added<overlapGrow and (not(prev[prevI] in spaceChars)):
                        prevInit=prev[prevI]+prevInit
                        prevI=prevI-1
                        added=added+1

                    prev=prevInit



                parts[i-1]=prevUpdate

                next=parts[i+1] if i<pLenN1 else ''
                if next:
                    nextInit=next[0:overlap]
                    nextI=overlap
                    added=0
                    while nextI<len(next) and added<overlapGrow and (not(next[nextI] in spaceChars)):
                        nextInit=nextInit+next[nextI]
                        nextI=nextI+1
                        added=added+1
                    next=nextInit


                prevUpdate=(prev+overlapSep+parts[i]+overlapSep+next).strip()

                i=i+1

            parts[i-1]=prevUpdate


        # trim parts
        i=0
        while i<len(parts):
            part=parts[i].strip()
            if part:
                parts[i]=part
                i=i+1
            else:
                parts.pop(i)


        return parts

def splitOn(text:str,sepList:List[str],size:int)->List[str]:
    sep='' if len(sepList) == 0 else sepList[0]
    if len(sepList):
        sepList=sepList.copy()
        sepList.pop(0)

    if sep:
        parts=text.split(sep)

        i=0
        while i<len(parts):
            parts[i]=parts[i]+sep
            i=i+1

        i=0
        while i<len(parts):

            part=parts[i]+sep

            if len(part) > size:
                parts.pop(i)
                sub=splitOn(part,sepList,size)
                for s in sub:
                    parts.insert(i,s)
                    i=i+1
                i=i-1

            i=i+1

        return parts

    else:
        parts:List[str]=[]
        i=0
        strLen=len(text)
        while i<strLen:
            parts.append(text[i:i+size])
            i=i+size

        return parts

