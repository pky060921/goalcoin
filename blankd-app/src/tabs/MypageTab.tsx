import React from 'react';

export const MypageTab = ({ safeAddress, enokiFlow, useAiRecommend, setUseAiRecommend, studyMode, setStudyMode, handleDeleteAll, globalDict, saveGlobalDict }: any) => {
  
  // 💡 DB에서 설정값(ai_rules)을 읽어옵니다. 없으면 빈 객체 반환.
  const aiRules = globalDict?.ai_rules || {};

  // 💡 토글 스위치 상태를 DB에 저장하는 함수 (오류 진단 로직 포함)
  const handleToggleRule = (ruleKey: string) => {
    try {
      console.log(`[진단] '${ruleKey}' 설정 변경 시도 중...`);
      const nextVal = !aiRules[ruleKey];
      const nextRules = { ...aiRules, [ruleKey]: nextVal };
      
      // 1. 즉시 DB에 저장
      if (saveGlobalDict) {
        saveGlobalDict({ ...globalDict, ai_rules: nextRules });
        console.log(`[진단] DB 저장 신호 전송 완료:`, nextRules);
      } else {
        console.error(`[진단 오류] App.tsx로부터 saveGlobalDict 함수를 전달받지 못했습니다!`);
      }

      // 2. 화면 즉각 반응을 위해 App state도 함께 업데이트
      if (ruleKey === 'useAiRecommend' && setUseAiRecommend) {
        setUseAiRecommend(nextVal);
      }
    } catch (error) {
      console.error(`[진단 오류] 설정 저장 중 치명적 에러 발생:`, error);
    }
  };

  // 💡 레이아웃 모드(법령/일반) 상태를 DB에 저장하는 함수
  const handleStudyMode = (mode: string) => {
    try {
      const nextRules = { ...aiRules, studyMode: mode };
      if (saveGlobalDict) saveGlobalDict({ ...globalDict, ai_rules: nextRules });
      if (setStudyMode) setStudyMode(mode);
      console.log(`[진단] 레이아웃 모드 '${mode}' DB 저장 완료`);
    } catch (error) {
      console.error(`[진단 오류] 레이아웃 저장 중 에러 발생:`, error);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-8 py-16 animate-in fade-in">
      <div className="border border-white/10 p-6 rounded-sm">
        
        <div className="text-xs text-white/60 mb-2">계정 및 지갑 정보</div>
        <div className="text-[11px] font-mono text-teal-400 bg-black/50 p-3 rounded mb-4 break-all">
          {safeAddress || "연결된 계정 없음"}
        </div>
        <button onClick={() => { enokiFlow?.logout(); window.location.reload(); }} className="px-4 py-2 text-xs border border-white/20 text-white/60 hover:text-white hover:bg-white/10 rounded-sm mb-6 transition-all">
          로그아웃
        </button>

        <div className="border-t border-white/10 my-6"></div>

        {/* 💡 [학습자료 업로드 설정] CraftTab에서 여기로 완벽하게 이사 완료! */}
        <div className="text-xs text-white/60 mb-4">학습자료 업로드 및 AI 설정 (DB 자동 동기화)</div>
        <div className="space-y-4 mb-8 bg-[#0a0a0c] border border-white/10 p-5 rounded-sm shadow-inner">
          <label className="flex items-center justify-between cursor-pointer group">
            <span className="text-xs sm:text-sm text-white/70 group-hover:text-amber-400 transition-colors">숫자, 영문 빈칸 추천</span>
            <input type="checkbox" checked={aiRules.useAiRecommend || false} onChange={() => handleToggleRule('useAiRecommend')} className="w-5 h-5 accent-amber-500 rounded bg-black border-white/20 cursor-pointer" />
          </label>
          
          <label className="flex items-center justify-between cursor-pointer group">
            <span className="text-xs sm:text-sm text-white/70 group-hover:text-amber-400 transition-colors">AI 추천 빈칸 우선적용</span>
            <input type="checkbox" checked={aiRules.aiPrior || false} onChange={() => handleToggleRule('aiPrior')} className="w-5 h-5 accent-amber-500 rounded bg-black border-white/20 cursor-pointer" />
          </label>

          <label className="flex items-center justify-between cursor-pointer group">
            <span className="text-xs sm:text-sm text-white/70 group-hover:text-amber-400 transition-colors">법조항 (제X조)만 굵게 표시</span>
            <input type="checkbox" checked={aiRules.boldLaw || false} onChange={() => handleToggleRule('boldLaw')} className="w-5 h-5 accent-amber-500 rounded bg-black border-white/20 cursor-pointer" />
          </label>
        </div>

        <div className="border-t border-white/10 my-6"></div>

        {/* 💡 [학습 콘텐츠 레이아웃 설정] 로컬저장에서 DB저장으로 업그레이드! */}
        <div className="text-xs text-white/60 mb-4">학습 콘텐츠 레이아웃 설정 (DB 자동 동기화)</div>
        <div className="flex gap-2 mb-4">
          {['법령', '일반'].map(mode => (
            <button 
              key={mode} 
              onClick={() => handleStudyMode(mode)} 
              className={`px-4 py-2 text-xs font-bold rounded-sm transition-colors ${(aiRules.studyMode || studyMode) === mode ? 'bg-indigo-600 text-white' : 'border border-white/10 text-white/40 hover:bg-white/5'}`}
            >
              {mode} 모드
            </button>
          ))}
        </div>
        <p className="text-[10px] text-white/40 leading-relaxed">
          * 법령 모드: [법, 령, 규칙] 등 법률 용어에 맞게 카드가 배치됩니다.<br/>
          * 일반 모드: 일반적인 텍스트 학습에 최적화된 넓은 카드로 표시됩니다.
        </p>
      </div>
    </div>
  );
}
