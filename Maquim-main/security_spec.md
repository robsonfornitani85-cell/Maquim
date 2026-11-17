# Especificação de Segurança Firestore — Maquim Lorena

## 1. Invariantes de Dados
1. **Default-Deny Global**: Nenhuma coleção ou documento pode ser lido ou gravado a menos que seja explicitamente autorizado.
2. **Isolamento de PII**: Dados pessoais (`responsavelCPF`, `emailDestinatario`) ficam isolados na coleção `/ordens/{osId}`, acessíveis somente ao criador (`createdByUid == request.auth.uid`) ou ao administrador (`isAdmin()`). O estado operacional compartilhado entre técnicos em `/contract_sync/lorena_234` não armazena CPF nem e-mail.
3. **Integridade de Identidade**: Todo documento criado em `/ordens/{osId}` e `/ordens/{osId}/attachments/{attType}` exige `request.auth != null`, `request.auth.token.email_verified == true` e `incoming().createdByUid == request.auth.uid`.
4. **Imutabilidade de Auditoria e Bloqueio Terminal**: `createdByUid`, `createdAt` e `id` são imutáveis após a criação. Ordens de Serviço nunca são deletadas (`allow delete: if false`). Apenas o administrador pode anular uma OS (`anulada: true`), e ordens anuladas não podem mais ser modificadas por técnicos.
5. **Integridade Temporal**: `createdAt` e `updatedAt` devem ser iguais a `request.time` (serverTimestamp).
6. **Prevenção de Exaustão (Denial of Wallet)**: Todos os IDs seguem `^[a-zA-Z0-9_\-]+$` com tamanho máximo de 128 caracteres. Todas as strings e arrays possuem validação estrita de tipo e tamanho máximo.

## 2. Payloads Adversariais ("Dirty Dozen")
1. **Unauthenticated Read/Write**: Leitura ou gravação em `/ordens/os-1` com `auth = null` -> `PERMISSION_DENIED`.
2. **Email Não Verificado**: Gravação com `auth.token.email_verified = false` -> `PERMISSION_DENIED`.
3. **Identity Spoofing**: Criação de `/ordens/os-1` com `createdByUid = "outro-uid"` -> `PERMISSION_DENIED`.
4. **Shadow Field Injection**: Payload em `/ordens/os-1` contendo campo não listado (`isAdmin: true`) -> `PERMISSION_DENIED`.
5. **Email Spoofing Admin**: Token com `email = "robsonfornitani85@gmail.com"` mas `email_verified = false` -> `PERMISSION_DENIED`.
6. **PII Leak (Cross-User Get)**: Técnico B tentando `get` em `/ordens/os-do-tecnico-A` -> `PERMISSION_DENIED`.
7. **Query Scraping (Unfiltered List)**: Técnico tentando `list` em `/ordens` sem filtro `where('createdByUid', '==', uid)` -> `PERMISSION_DENIED`.
8. **ID Poisoning**: Gravação em `/ordens/id..com..barra..ou..1500chars` -> `PERMISSION_DENIED`.
9. **Resource Poisoning (1MB String)**: Envio de `observacoes` ou `tecnicoNome` com 100.000 caracteres -> `PERMISSION_DENIED`.
10. **Temporal Manipulation**: Envio de `createdAt` no passado/futuro em vez de `serverTimestamp()` (`request.time`) -> `PERMISSION_DENIED`.
11. **Terminal State Bypass**: Técnico tentando atualizar OS já marcada com `anulada: true` -> `PERMISSION_DENIED`.
12. **Privilege Escalation**: Técnico não-admin tentando inserir documento em `/admins/{uid}` ou anular OS de outro usuário -> `PERMISSION_DENIED`.
