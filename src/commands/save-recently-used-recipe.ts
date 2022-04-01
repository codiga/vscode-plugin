import { setToLocalStorage } from "../utils/localStorage"
import { generateKeyForUsedRecipe } from "../utils/snippetUtils";

export async function saveRecentlyUsedItem(
    shortcut: string, language: string
) {
    setToLocalStorage(generateKeyForUsedRecipe(language, shortcut), new Date().getTime().toString());
}