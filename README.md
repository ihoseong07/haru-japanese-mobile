# 하루와 일본어

가입·API 키·결제 없이 휴대폰 안에서 연습하는 일본어 음성 회화입니다.

처음 자유 회화 준비에는 약 600MB 다운로드가 필요합니다. Wi-Fi와 최신 Chrome/Safari를 권장합니다. 녹음·입력 문장은 서버로 보내지 않고 브라우저 안에서 처리하며, 복습 기록도 기기에 저장합니다. 작은 로컬 AI는 실수할 수 있습니다.

주제를 선택하고 **10분 자유 회화 시작**을 누르세요. **말하기**로 녹음하고 **말하기 끝**으로 멈춘 뒤 인식된 문장을 확인해 보내면 됩니다. 한국어로 답하거나 키보드로 입력해도 됩니다.

**예문으로 먼저 연습하기**는 정해진 16개 질문과 예문 비교 방식이며 자유 답변의 정오를 평가하지 않습니다.

## 공개 구성과 라이선스

- Wllama 4.0.0 / wllama-compat 4.0.0: https://github.com/ngxson/wllama (LICENSE 포함)
- Qwen3-0.6B Q4_K_M: https://huggingface.co/unsloth/Qwen3-0.6B-GGUF (모델은 브라우저에서 별도로 다운로드)
- Transformers.js 3.8.1: https://github.com/huggingface/transformers.js
- Whisper tiny: https://huggingface.co/onnx-community/whisper-tiny (브라우저에서 별도로 다운로드)
- ONNX Runtime Web 1.22.0-dev.20250409-89f8206ba4: https://github.com/microsoft/onnxruntime
- Open JTalk WebAssembly: https://github.com/keanu-thakalath/openjtalkjs (LICENSE와 THIRD_PARTY_NOTICES 포함)
- Open JTalk 사전: assets/dictionary/COPYING 참고

이 저장소에는 개인 대화나 녹음, API 키가 포함되지 않습니다.
