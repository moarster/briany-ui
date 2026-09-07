import { defineConfig } from '@hey-api/openapi-ts'

export default defineConfig({
  input: './contract/rest/openapi-v1.yaml',
  output: { path: './src/api/generated', format: 'prettier' },
  plugins: [
    '@hey-api/typescript',
    { name: '@hey-api/sdk', asClass: false },
    { name: '@hey-api/client-fetch', runtimeConfigPath: '../runtime-config' },
    { name: '@tanstack/react-query', queryOptions: true, mutationOptions: true },
  ],
})
