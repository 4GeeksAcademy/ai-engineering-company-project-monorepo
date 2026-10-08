import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        # 1. Login if necessary
        await page.goto('http://localhost:3000/login')
        await page.fill('input[type="email"]', 'nexova@nexova.com')
        await page.fill('input[type="password"]', 'securepassword123') # Guessing password
        await page.click('button[type="submit"]')
        await page.wait_for_timeout(2000)
        
        # 2. Formulario con error de validación (Incidencias -> Analizar)
        await page.goto('http://localhost:3000/incidents')
        await page.wait_for_timeout(1000)
        await page.click('button:has-text("Analizar")') # Submit without text
        await page.wait_for_timeout(1000)
        await page.screenshot(path='captura_error_validacion.png')
        print("Captura 1 guardada: captura_error_validacion.png")
        
        # 3. Panel de listado con datos (Tickets o Incidencias list)
        await page.goto('http://localhost:3000/admin/tickets')
        await page.wait_for_timeout(2000)
        await page.screenshot(path='captura_listado_datos.png')
        print("Captura 2 guardada: captura_listado_datos.png")
        
        # 4. Panel de resumen con métricas (Panel Overview)
        await page.goto('http://localhost:3000/admin/panel')
        await page.wait_for_timeout(2000)
        await page.screenshot(path='captura_resumen_metricas.png')
        print("Captura 3 guardada: captura_resumen_metricas.png")
        
        await browser.close()

if __name__ == "__main__":
    import sys
    try:
        asyncio.run(main())
    except Exception as e:
        print(f"Error crítico capturando pantallas: {e}", file=sys.stderr)
        sys.exit(1)
