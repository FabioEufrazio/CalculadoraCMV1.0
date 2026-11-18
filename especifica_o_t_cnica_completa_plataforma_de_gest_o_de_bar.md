# Especificação Técnica Avançada: Plataforma de Gestão de CMV e Fichas Técnicas

## 1. Visão Geral e Objetivos do Projeto
Uma aplicação web (SaaS/B2B) voltada para gestão de bares e restaurantes, com foco em:
*   Controle rigoroso de Custo de Mercadoria Vendida (CMV).
*   Criação de fichas técnicas padronizadas e escaláveis.
*   Gestão inteligente de estoque e rendimento de insumos (yield).
*   Visualização adaptada por nível de usuário (Gestores = Financeiro; Bartenders = Operacional).

## 2. Stack Tecnológico
*   **Front-end & UI:** Antgravity (Foco em performance, modais leves e design responsivo).
*   **Backend & Banco de Dados:** Firebase Firestore (NoSQL).
*   **Autenticação:** Firebase Authentication.
*   **Controle de Versão:** Git.

---

## 3. Arquitetura de Banco de Dados (Firestore Schemas)

A estrutura NoSQL foi desenhada para leitura rápida e para manter o histórico de custos intacto.

### 3.1. Coleção: `users`
```json
{
  "uid": "abc123xyz",
  "nome": "Carlos Bartender",
  "email": "carlos@bar.com",
  "role": "bartender", // 'gestor' ou 'bartender'
  "status": "ativo",
  "data_criacao": "2026-11-10T19:30:00Z"
}
```

### 3.2. Coleção: `suppliers`
```json
{
  "id": "sup_01",
  "nome_empresa": "Distribuidora de Bebidas X",
  "contato": "+5511999999999",
  "prazo_entrega_dias": 2,
  "dias_pedido": ["Segunda", "Quinta"]
}
```

### 3.3. Coleção: `ingredients`
```json
{
  "id": "ing_01",
  "nome": "Limão Tahiti (Suco)",
  "categoria": "Cítrico",
  "fornecedor_id": "sup_01",
  "unidade_medida_base": "ml",
  "compra": {
    "preco_embalagem": 10.00,
    "volume_comprado": 1000,
    "unidade_compra": "g"
  },
  "rendimento": {
    "percentual_yield": 40,
    "volume_final_utilizavel": 400
  },
  "custos_calculados": {
    "custo_por_ml_g": 0.025
  },
  "estoque": {
    "quantidade_atual": 1500,
    "estoque_minimo": 500
  }
}
```

### 3.4. Coleção: `recipes`
```json
{
  "id": "rec_01",
  "nome_coquetel": "Margarita Clarificada",
  "categoria": "Autoral",
  "metodo_preparo": "Batido e Coado duplamente",
  "copo": "Coupé",
  "guarnicao": "Borda de sal negro",
  "foto_url": "https://...",
  "financeiro": {
    "custo_total": 9.45,
    "preco_venda": 38.00,
    "cmv_percentual": 24.86,
    "lucro_bruto": 28.55
  },
  "ingredientes": [
    {
      "ingredient_id": "ing_01",
      "nome_exibicao": "Suco de Limão",
      "quantidade_usada": 30,
      "unidade_medida": "ml",
      "custo_parcial": 0.75
    }
  ],
  "instrucoes_preparo": [
    "1. Adicionar todos os ingredientes na coqueteleira.",
    "2. Bater vigorosamente com gelo."
  ]
}
```

---

## 4. Regras de Segurança (Firestore Security Rules)
Este código deve ser aplicado diretamente nas regras do Firestore para proteger os dados.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isLogged() { return request.auth != null; }
    function isGestor() { 
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'gestor'; 
    }

    match /users/{userId} {
      allow read: if isLogged() && request.auth.uid == userId;
      allow write: if isGestor();
    }

    match /recipes/{recipeId} {
      allow read: if isLogged();
      allow write: if isGestor();
    }

    match /ingredients/{ingredientId} {
      allow read: if isLogged();
      allow write: if isGestor();
    }

    match /suppliers/{supplierId} {
      allow read, write: if isGestor();
    }
  }
}
```

---

## 5. Lógica Matemática (Motor Financeiro)

As seguintes fórmulas devem ser implementadas no Front-end (Antgravity) para calcular em tempo real durante a criação de insumos e receitas:

*   **Yield (Rendimento):** `(Volume Extraído / Volume Comprado) * 100`
    *   *Ex:* Comprou 1000g de limão. Extraiu 400ml. Yield = 40%.
*   **Custo por ml/g (Insumo Processado):** `Preço da Embalagem / Volume Extraído`
    *   *Ex:* R$ 10,00 / 400ml = R$ 0,025 por ml.
*   **Custo Parcial da Dose:** `Custo por ml * Quantidade Usada`
    *   *Ex:* R$ 0,025 * 30ml = R$ 0,75.
*   **CMV (%):** `(Soma dos Custos Parciais / Preço de Venda do Coquetel) * 100`
*   **Sugestão de Preço Inteligente:** `Custo Total do Coquetel / (Meta de CMV% / 100)`

---

## 6. Lógica de Baixa de Estoque (Transações)

Para evitar furos de estoque em uso simultâneo, a baixa **deve** usar `runTransaction` do Firebase.

```javascript
// Exemplo conceitual para implementação
import { doc, runTransaction } from "firebase/firestore";
import { db } from "./firebaseConfig";

async function processarVenda(recipeId, quantidadeVendida) {
  await runTransaction(db, async (transaction) => {
    const recipeRef = doc(db, "recipes", recipeId);
    const recipeDoc = await transaction.get(recipeRef);
    
    const ingredientes = recipeDoc.data().ingredientes;
    const refsInsumos = ingredientes.map(ing => doc(db, "ingredients", ing.ingredient_id));
    
    // Fase de leitura (obrigatória antes das escritas em transações)
    const docsInsumos = await Promise.all(refsInsumos.map(ref => transaction.get(ref)));
    
    // Fase de escrita
    docsInsumos.forEach((ingDoc, index) => {
      const ingReceita = ingredientes[index];
      const estoqueAtual = ingDoc.data().estoque.quantidade_atual;
      const novoEstoque = estoqueAtual - (ingReceita.quantidade_usada * quantidadeVendida);
      
      transaction.update(refsInsumos[index], { 
        "estoque.quantidade_atual": novoEstoque 
      });
    });
  });
}
```

---

## 7. Diretrizes de UI/UX (Antgravity)

### 7.1. Cores e Identidade Visual
*   **Cores de Status (Feedback Visual de CMV):**
    *   Verde (`#10B981`): CMV Ideal (Abaixo de 25%)
    *   Amarelo (`#F59E0B`): CMV Aceitável (26% a 30%)
    *   Vermelho (`#EF4444`): CMV Crítico (Acima de 30%)
*   **Modos de Visualização:**
    *   *Modo Gestão:* Interface clara, tabelas densas para análise de dados, sidebar esquerda.
    *   *Modo Serviço (Bartender):* Dark Mode obrigatório, tipografia grande (sans-serif), interface baseada em cartões.

### 7.2. Estrutura de Componentes
1.  **`<ViewGestao>`**:
    *   `Sidebar`: Links para Dashboard, Receitas, Insumos, Fornecedores.
    *   `BuilderReceita`: Tela dividida (Esquerda: adição de insumos via search/autocomplete; Direita: Preview do copo e gráfico em anel dinâmico mostrando impacto financeiro).
2.  **`<ViewBalcao>`**:
    *   `CocktailGrid`: Grade com fotos dos coquetéis.
    *   `CocktailDetail`: Modal cobrindo a tela toda, fundo escuro. Lista de ingredientes com checkboxes estilo "To-Do" e passos de preparo. **Zero informações de custo.**