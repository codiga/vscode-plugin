import { PREFIX_RECENTLY_ADDED_RECIPE } from "../constants";
import { getKeysFromLocalStorage, removeFromLocalStorage, setToLocalStorage } from "../utils/localStorage"

export async function removeRecentlyUsedRecipes() {
    getKeysFromLocalStorage().forEach(key => {
        if(key.includes(PREFIX_RECENTLY_ADDED_RECIPE)){
            removeFromLocalStorage(key);
        }
    });
}