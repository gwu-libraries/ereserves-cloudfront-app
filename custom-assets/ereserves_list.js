async function loadFilesList() {
    try {
        const response = await fetch(`${window.location.origin}/ereserves_files.json`);
        const filesList = await response.json();
        return filesList.reduce( (map, item) => {
            const pathArray = item.split("/");
            if (pathArray.length != 4) {
                return map;
            }
            const [libraryKey, instructorKey, fileKey] = pathArray.slice(1);
            if (map.has(libraryKey) && map.get(libraryKey).has(instructorKey)) {
                map.get(libraryKey).get(instructorKey).push(fileKey);
            }
            else if (map.has(libraryKey)) {
                map.get(libraryKey).set(instructorKey, [fileKey]);
            }
            else {
                map.set(libraryKey, new Map([[instructorKey, [fileKey]]]));
            }
            return map;
        }, new Map());
    }
    catch (error) {
        console.error(error);
    }
}
function updateMenu(menuId, keys) {
    const menuNode = document.getElementById(menuId);
    menuNode.innerHTML = "";
    for (const key of keys) {
        let option = document.createElement("option");
        option.textContent = key;
        menuNode.appendChild(option);
    }
    return menuNode;
}

function addRows(files, path) {
    console.log(files)
    const tableNode = document.getElementById("table-body");
    tableNode.innerHTML = "";
    for (const file of files) {
        const rowNode =  document.createElement("tr"),
            fileNode = document.createElement("td"),
            linkNode = document.createElement("td");
        fileNode.textContent = file;
        const fileLink = `${window.location.origin}/?file=${path}/${file}`,
            linkRefNode = document.createElement("a");
        linkRefNode.textContent = fileLink;
        linkRefNode.href = fileLink;
        linkNode.appendChild(linkRefNode);
        rowNode.append(fileNode, linkNode);
        tableNode.appendChild(rowNode);
    }
}



window.addEventListener("load", async (event) => {
    const filesMap = await loadFilesList(),
        libraryMenu = updateMenu("library-select", filesMap.keys()),
        instructorMenu = updateMenu("instructor-select", filesMap.get(filesMap.keys().next().value).keys());
    libraryMenu.addEventListener("change", (e) => {
        const instructorMenuKeys = filesMap.get(libraryMenu.value);
        updateMenu("instructor-select", instructorMenuKeys.keys());
    });
    instructorMenu.addEventListener("change", updateTable);

    function updateTable(e) {
            files = filesMap.get(libraryMenu.value).get(instructorMenu.value),
            path = `ereserves/${libraryMenu.value}/${instructorMenu.value}`;
        addRows(files, path);
    }
});