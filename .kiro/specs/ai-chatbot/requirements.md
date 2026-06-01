# Requirements Document

## Introduction

Tài liệu này mô tả các yêu cầu cho tính năng **AI Chat Bot** (`ai-chatbot`) của module
`app-mini` (REALTIME LOCAL SOCIAL). Các yêu cầu được **suy ra (derive) từ tài liệu
thiết kế đã được duyệt** (`design.md`) và bám sát đúng phạm vi đã mô tả ở đó: một trang
trò chuyện AI lazy-loaded, gửi/nhận tin nhắn, phản hồi dạng streaming kèm fallback
non-streaming, quản lý trạng thái hội thoại, hủy/gửi lại/xóa hội thoại, hiển thị giao
diện trò chuyện, xử lý lỗi đã chuẩn hoá, và đặc biệt là **ràng buộc bảo mật bắt buộc**:
OpenAI API key tuyệt đối không xuất hiện ở client.

Các yêu cầu này không mở rộng phạm vi ngoài những gì `design.md` đã định nghĩa.

## Glossary

- **AI_Chat_Service**: Core service `RlsAiChatService` (`providedIn: 'root'`) giữ state
  một hội thoại AI và điều phối gọi backend (streaming + fallback).
- **AI_Chat_Page**: Standalone page `RlsAiChatPage` được lazy-load qua route
  `/app-mini/ai-chat`, render giao diện trò chuyện.
- **API_Service**: `RlsApiService`, wrapper HTTP non-streaming, bóc envelope
  `{ data, meta?, message? }`, lấy host từ `API_URL`.
- **Auth_Interceptor**: `RlsAuthInterceptor`, tự gắn Bearer `rls_access_token` cho các
  request đi qua Angular `HttpClient`.
- **Auth_Service**: `RlsAuthService`, cung cấp access token (`getAccessToken()`).
- **Message_Bubble**: Shared component `RlsAiMessageBubbleComponent`, render một tin
  nhắn (căn phải cho `user`, trái cho `assistant`).
- **Chat_Input**: Shared component `RlsAiChatInputComponent`, textarea + nút gửi/hủy.
- **Chat_Message**: Một tin nhắn hội thoại gồm `id`, `role`, `content`, `state`,
  `createdAt`.
- **Conversation_Status**: Trạng thái tổng hợp của hội thoại cho UI, một trong
  `idle | loading | streaming | error`.
- **Chat_Error**: Lỗi đã chuẩn hoá với `code` ∈ `{network, server, aborted, rate_limit, unknown}`
  và `message` thân thiện.
- **API_URL**: Hằng host backend lấy từ `environment.ts` (không hardcode trong mã).
- **RLS_API**: Tập hằng đường dẫn endpoint (single source of truth), gồm `AI_CHAT` và
  `AI_CHAT_STREAM`.

## Requirements

### Requirement 1: Truy cập trang trò chuyện AI

**User Story:** As một người dùng app-mini, I want mở trang trợ lý AI qua một route riêng, so that tôi có thể bắt đầu một cuộc trò chuyện với AI.

#### Acceptance Criteria

1. WHEN người dùng điều hướng tới đường dẫn `/app-mini/ai-chat`, THE AI_Chat_Page SHALL được tải theo cơ chế lazy-load và hiển thị giao diện trò chuyện.
2. WHEN AI_Chat_Page được tải lần đầu, THE AI_Chat_Page SHALL hiển thị hội thoại ở trạng thái trống không có Chat_Message nào.

### Requirement 2: Gửi tin nhắn người dùng

**User Story:** As một người dùng, I want nhập và gửi câu hỏi, so that tôi có thể nhận được câu trả lời từ AI.

#### Acceptance Criteria

1. WHEN người dùng gửi một prompt có nội dung khác rỗng sau khi cắt khoảng trắng đầu/cuối, THE AI_Chat_Service SHALL thêm đúng một Chat_Message vai trò `user` và một Chat_Message placeholder vai trò `assistant` vào danh sách tin nhắn.
2. IF prompt rỗng hoặc chỉ chứa khoảng trắng sau khi cắt khoảng trắng đầu/cuối, THEN THE AI_Chat_Service SHALL giữ nguyên danh sách tin nhắn hiện tại và không thêm Chat_Message nào.
3. WHILE Conversation_Status là `loading` hoặc `streaming`, THE Chat_Input SHALL vô hiệu hóa việc gửi prompt mới.
4. WHEN người dùng gửi một prompt hợp lệ, THE AI_Chat_Service SHALL lưu prompt đó làm prompt cuối phục vụ chức năng gửi lại.

### Requirement 3: Nhận phản hồi streaming và fallback non-streaming

**User Story:** As một người dùng, I want thấy câu trả lời hiện dần theo từng token, so that trải nghiệm trò chuyện mượt mà; và vẫn nhận được câu trả lời khi streaming không khả dụng.

#### Acceptance Criteria

1. WHERE backend hỗ trợ streaming, THE AI_Chat_Service SHALL gửi yêu cầu tới endpoint `AI_CHAT_STREAM` và nối lần lượt từng token delta vào nội dung Chat_Message assistant theo đúng thứ tự nhận được.
2. WHEN stream phát tín hiệu kết thúc (`[DONE]` hoặc `done = true`), THE AI_Chat_Service SHALL đặt Chat_Message assistant về trạng thái `complete`.
3. WHERE backend không hỗ trợ streaming, THE AI_Chat_Service SHALL gửi yêu cầu non-streaming qua API_Service tới endpoint `AI_CHAT` và gán toàn bộ nội dung trả về vào Chat_Message assistant.
4. WHEN API_Service nhận một response non-streaming dạng envelope `{ data, meta?, message? }`, THE API_Service SHALL trả về đúng phần `data` độc lập với sự hiện diện của `meta`.
5. IF streaming gặp lỗi sau khi đã nhận được một phần nội dung, THEN THE AI_Chat_Service SHALL thử nhánh non-streaming đúng một lần trước khi báo lỗi.
6. WHEN nhánh streaming (sau khi gộp delta) hoặc nhánh fallback hoàn tất thành công, THE AI_Chat_Service SHALL đặt Chat_Message assistant về trạng thái `complete` và Conversation_Status về `idle`.

### Requirement 4: Quản lý trạng thái hội thoại

**User Story:** As một người dùng, I want giao diện phản ánh đúng trạng thái hiện tại của hội thoại, so that tôi biết hệ thống đang chờ, đang trả lời, hay đã gặp lỗi.

#### Acceptance Criteria

1. WHEN không có yêu cầu nào đang chạy, THE AI_Chat_Service SHALL đặt Conversation_Status về `idle`.
2. WHILE một yêu cầu non-streaming đang chờ phản hồi, THE AI_Chat_Service SHALL đặt Conversation_Status về `loading`.
3. WHILE AI_Chat_Service đang nhận token streaming, THE AI_Chat_Service SHALL đặt Conversation_Status về `streaming`.
4. WHEN một yêu cầu kết thúc bằng lỗi, THE AI_Chat_Service SHALL đặt Conversation_Status về `error` và đặt Chat_Error gần nhất về một giá trị khác null.
5. WHEN cập nhật danh sách tin nhắn, THE AI_Chat_Service SHALL tạo một mảng tin nhắn mới và giữ nguyên tham chiếu của mọi Chat_Message không thay đổi thay vì sửa đổi tại chỗ.

### Requirement 5: Hủy yêu cầu đang chạy

**User Story:** As một người dùng, I want hủy một yêu cầu đang chạy, so that tôi có thể dừng câu trả lời mà không mất ngữ cảnh đã nhận.

#### Acceptance Criteria

1. WHEN người dùng hủy một yêu cầu đang chạy, THE AI_Chat_Service SHALL dừng (abort) yêu cầu streaming hoặc hủy đăng ký yêu cầu non-streaming.
2. WHEN một yêu cầu bị hủy, THE AI_Chat_Service SHALL giữ nguyên phần nội dung Chat_Message assistant đã nhận được và đặt Chat_Message assistant về trạng thái `complete`.
3. WHEN một yêu cầu bị hủy, THE AI_Chat_Service SHALL đặt Conversation_Status về `idle` và không áp thêm bất kỳ token delta nào.

### Requirement 6: Gửi lại prompt cuối (retry)

**User Story:** As một người dùng, I want gửi lại câu hỏi gần nhất khi gặp lỗi, so that tôi không phải nhập lại nội dung.

#### Acceptance Criteria

1. WHEN người dùng yêu cầu gửi lại sau khi gặp lỗi, THE AI_Chat_Service SHALL gửi lại prompt cuối đã lưu.

### Requirement 7: Xóa hội thoại

**User Story:** As một người dùng, I want xóa toàn bộ hội thoại, so that tôi có thể bắt đầu một cuộc trò chuyện mới.

#### Acceptance Criteria

1. WHEN người dùng xóa hội thoại, THE AI_Chat_Service SHALL xóa toàn bộ Chat_Message, đặt Conversation_Status về `idle`, và đặt Chat_Error gần nhất về null.

### Requirement 8: Hiển thị giao diện trò chuyện

**User Story:** As một người dùng, I want thấy tin nhắn và trạng thái hội thoại được trình bày rõ ràng, so that tôi dễ dàng theo dõi cuộc trò chuyện.

#### Acceptance Criteria

1. WHEN hiển thị một Chat_Message vai trò `user`, THE Message_Bubble SHALL căn tin nhắn về phía bên phải.
2. WHEN hiển thị một Chat_Message vai trò `assistant`, THE Message_Bubble SHALL căn tin nhắn về phía bên trái.
3. WHILE Conversation_Status là `loading`, THE AI_Chat_Page SHALL hiển thị chỉ báo đang tải.
4. WHILE Conversation_Status là `streaming`, THE AI_Chat_Page SHALL hiển thị chỉ báo đang gõ trên Chat_Message assistant đang sinh.
5. WHILE Conversation_Status là `error`, THE AI_Chat_Page SHALL hiển thị banner lỗi kèm nút gửi lại.
6. WHEN một Chat_Message mới được thêm vào danh sách và người dùng đang ở cuối danh sách, THE AI_Chat_Page SHALL tự động cuộn xuống Chat_Message mới nhất.

### Requirement 9: Xử lý và chuẩn hoá lỗi

**User Story:** As một người dùng, I want nhận thông báo lỗi rõ ràng và an toàn, so that tôi hiểu chuyện gì xảy ra mà không bị lộ thông tin nhạy cảm.

#### Acceptance Criteria

1. IF một yêu cầu thất bại do lỗi mạng hoặc `HttpErrorResponse` có `status = 0`, THEN THE AI_Chat_Service SHALL phân loại Chat_Error với `code = 'network'`.
2. IF backend trả về `status = 429`, THEN THE AI_Chat_Service SHALL phân loại Chat_Error với `code = 'rate_limit'`.
3. IF backend trả về `status ≥ 500` hoặc một khung stream chứa trường `error`, THEN THE AI_Chat_Service SHALL phân loại Chat_Error với `code = 'server'`.
4. IF một yêu cầu bị hủy phát sinh `AbortError`, THEN THE AI_Chat_Service SHALL phân loại Chat_Error với `code = 'aborted'`.
5. IF một lỗi không thuộc các loại `network`, `rate_limit`, `server`, hoặc `aborted`, THEN THE AI_Chat_Service SHALL phân loại Chat_Error với `code = 'unknown'`.
6. WHEN phân loại cùng một đầu vào lỗi, THE AI_Chat_Service SHALL luôn trả về cùng một `code` và một `message` không chứa API key, token, hay chi tiết hạ tầng nội bộ.
7. WHEN một yêu cầu kết thúc bằng lỗi không phải do người dùng hủy, THE AI_Chat_Service SHALL đặt Chat_Message assistant về trạng thái `error`.

### Requirement 10: Ràng buộc bảo mật OpenAI key

**User Story:** As một chủ sở hữu hệ thống, I want OpenAI API key không bao giờ xuất hiện ở client, so that key không bị lộ và hệ thống an toàn.

#### Acceptance Criteria

1. THE AI_Chat_Service SHALL không chứa, import, lưu, hoặc truyền OpenAI API key trong mã nguồn frontend dưới bất kỳ hình thức nào.
2. WHEN gửi bất kỳ yêu cầu nào tới backend, THE AI_Chat_Service SHALL chỉ gọi tới host lấy từ API_URL và không bao gồm chuỗi khớp pattern OpenAI key (`sk-...`) trong body hoặc header.
3. WHEN gọi endpoint AI qua nhánh non-streaming, THE Auth_Interceptor SHALL tự động gắn header `Authorization` với Bearer `rls_access_token`.
4. WHEN gọi endpoint AI qua nhánh streaming bằng `fetch`, THE AI_Chat_Service SHALL đính kèm thủ công header `Authorization` với Bearer token lấy từ Auth_Service.
5. THE AI_Chat_Service SHALL lấy đường dẫn endpoint từ `RLS_API` và host từ `API_URL` thay vì hardcode URL.
