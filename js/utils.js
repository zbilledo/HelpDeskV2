export async function loadComponent(componentSelector, componentPath) {
    const target = document.querySelector(componentSelector);

    if (!target) {
        console.error(`Target element "${componentSelector}" not found.`);
        return;
    }

    try {
        const response = await fetch(componentPath);

        if (!response.ok) throw new Error(`Failed to load: ${componentPath}`);

        target.innerHTML = await response.text();
    } catch (error) {
        console.error(error);
    }
}