## Vilken ny AI-teknik/bibliotek identifierade ni och hur tillämpade ni det?

Vi har använt oss av Gemini i sjävla appen. Den är promptad att vara en restaurangexpert. Användaren kan fylla i vad hen önskar äta, och Gemini hittar lämpliga förslag utifrån Overpass kart-API.

Utvecklingen av appen har gjorts med hjälp av VSCode Copilot/Cursor, med OpenAIs modeller och Clauade Sonnet som agent. Vi upptäckte snabbt att Claude i de allra flesta fallen var bättre än t.ex GPT 5.

Trots detta behövde vi ofta bråka med agenten för att få den att göra det vi bad om. En enkel prompt med en enkel ändring resulterade ofta i att agenten skrev om en eller flera filer helt och hållet. Agenten hade också svårt att hålla en röd tråd när det kom till styling i olika flikar. Vi bad den att efterlikna swipefunktionen i Restarants när den skulle bygga Movies-fliken. Resultatet blev snarlikt, efter många propar blev resultatet det vi efterfrågat.

Det mest extrema fallet av konstig AI-kod uppstod när vi bad agenten att implementera en AI-komponent i appen. I stället för att göra det vi bad den om skrev den en 2000 rader lång fil som innehöll en algoritm, vilken skulle simulera en AI. Först några dagar senare upptäckte vi att det inte var AI och fick göra ett nytt försök.

## Motivera varför ni valde den AI-tekniken/det biblioteket.

Vi valde Gemini för att den var smidigast att implementera i kod, den är lättillgänglig och förhållandevis billig.

## Varför behövdes AI-komponenten? Skulle ni kunna löst det på ett annat sätt?

Det hade varit svårt att matcha användarens specifika önskemål om t.ex "bra hamburgare" eller "billig sushi" utan AIs möjlighet att göra stora avancerade sökningar. Det hade krävt att vi på något sätt hämtat in stora mängder data om alla restauranger i närheten och returnerat förslag med hög pricksäkerhet.
