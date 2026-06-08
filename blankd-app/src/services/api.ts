const BASE_URL = "https://api.blankd.top/api";

export const api = {
  async getCategories(address: string) {
    const res = await fetch(`${BASE_URL}/get-categories?wallet_address=${address}`);
    return res.json();
  },
  async getMyCards(address: string) {
    const res = await fetch(`${BASE_URL}/my-cards?wallet_address=${address}`);
    return res.json();
  },
  async deleteCard(address: string, id: number) {
    return fetch(`${BASE_URL}/delete-card`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet_address: address, id })
    });
  },
  async deleteAll(address: string) {
    return fetch(`${BASE_URL}/delete-all`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet_address: address })
    });
  },
  async generateStyles(articleText: string) {
    const res = await fetch(`${BASE_URL}/generate-styles`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ article_text: articleText })
    });
    if (!res.ok) throw new Error("스타일 샘플 생성 실패");
    return res.json();
  },
  async uploadExamCoop(file: File, address: string, answerFile?: File) {
    const fd = new FormData();
    fd.append("exam_file", file);
    if (answerFile) fd.append("answer_file", answerFile);
    fd.append("wallet_address", address);
    const res = await fetch(`${BASE_URL}/upload-exam-coop`, { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "모의고사 업로드 실패");
    return data;
  },
  async getPendingExams(address: string) {
    const res = await fetch(`${BASE_URL}/get-pending-exams?wallet_address=${address}`);
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "대기열 로딩 실패");
    return Array.isArray(data) ? data : [];
  },
  async deletePendingExam(address: string, id: number) {
    return fetch(`${BASE_URL}/delete-pending-exam`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet_address: address, id })
    });
  },
  async analyzeChunk(chunkText: string, userFeedback: string, chatHistory: Array<{ sender: string; text: string }> = []) {
    const res = await fetch(`${BASE_URL}/analyze-chunk`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chunk_text: chunkText, user_feedback: userFeedback, chat_history: chatHistory })
    });
    return res.json();
  },
  async saveGoldenExam(data: any) {
    const res = await fetch(`${BASE_URL}/save-golden-exam`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  async getGoldenExams(address: string) {
    const res = await fetch(`${BASE_URL}/get-golden-exams?wallet_address=${address}`);
    return res.json();
  },
  async getCbtSession(address: string) {
    const res = await fetch(`${BASE_URL}/get-cbt-session?wallet_address=${address}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "CBT 데이터를 불러오지 못했습니다.");
    }
    return res.json();
  },
  async getGoalCoinBalance(address: string) {
    try {
      const res = await fetch('https://fullnode.testnet.sui.io/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "suix_getCoins",
          params: [address, "0x2::sui::SUI"] 
        })
      });
      const data = await res.json();
      if (data.result && data.result.data) {
        const total = data.result.data.reduce((acc: number, coin: any) => acc + Number(coin.balance), 0);
        return total / 1000000000;
      }
      return 0;
    } catch (e) {
      console.error("잔고 조회 실패", e);
      return 0;
    }
  },
  async deleteFolder(address: string, folderName: string) {
    const res = await fetch(`${BASE_URL}/delete-folder`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet_address: address, folder_name: folderName })
    });
    if (!res.ok) throw new Error("폴더 삭제에 실패했습니다.");
    return res.json();
  },
  async renameFolder(address: string, oldFolderName: string, newFolderName: string) {
    const res = await fetch(`${BASE_URL}/rename-folder`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet_address: address, old_folder_name: oldFolderName, new_folder_name: newFolderName })
    });
    if (!res.ok) throw new Error("폴더명 변경 실패");
    return res.json();
  },
  async updateCategoryFolder(address: string, id: number, newFolderName: string) {
    const res = await fetch(`${BASE_URL}/update-category-folder`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: address, id, new_folder_name: newFolderName })
    });
    if (!res.ok) throw new Error("항목 이동 실패");
    return res.json();
  },
  
  // 💡 [신규 교체] 통합 글로벌 단어장 API (제외 단어, 필수 단어, 약어)
  async getGlobalDict(address: string) {
    try {
      const res = await fetch(`${BASE_URL}/get-global-dict?wallet_address=${address}`);
      if (!res.ok) throw new Error("글로벌 사전 동기화 실패");
      return await res.json();
    } catch (error) {
      console.error("[진단: api.ts] getGlobalDict 통신 에러 발생:", error);
      throw error;
    }
  },
  async updateGlobalDict(address: string, dictData: any) {
    try {
      const res = await fetch(`${BASE_URL}/update-global-dict`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: address, ...dictData })
      });
      if (!res.ok) throw new Error("글로벌 사전 업데이트 실패");
      return await res.json();
    } catch (error) {
      console.error("[진단: api.ts] updateGlobalDict 통신 에러 발생:", error);
      throw error;
    }
  }
};

// 💡 런타임 오류 진단 코드 (App.tsx 등에서 API 객체가 정상 조립되었는지 콘솔로 실시간 확인)
if (typeof window !== 'undefined') {
  try {
    if (typeof api.getGlobalDict !== 'function') {
      console.error("🚨 [치명적 진단 에러] api.getGlobalDict가 함수로 등록되지 않았습니다! api.ts 내보내기 구조를 확인하세요.");
    } else {
      console.log("🚀 [진단 완료] api.ts 모듈 로드 성공 및 getGlobalDict 함수 정상 등록됨.");
    }
  } catch (e) {
    console.error("🚨 [진단 에러] 진단 스크립트 실행 중 오류 발생:", e);
  }
}
