window.onload = (event) => {
    const downloadTargetParamsString = window.location.search;
    const downloadTargetParams = new URLSearchParams(downloadTargetParamsString);
    try {
        const filePath = downloadTargetParams.get("file");
        document.getElementById("message").innerHTML = document.getElementById("message").innerHTML.replace("download", `download of ${filePath}`);
        window.location.assign(filePath);
    } catch (error) {
        console.error(error);
    }
};