import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle("Checkout API")
    .setDescription("Catálogo de productos y salud del checkout.")
    .setVersion("1.0")
    .build();

  const document = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);
}
