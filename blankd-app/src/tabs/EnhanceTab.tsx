import React, { useState, useEffect } from 'react';
import { formatCardText, parseCardStats, SPLIT_REGEX } from '../utils/constants';
import { api } from '../services/api';

const getGridClass = (cols: number) => {
  if(cols === 1) return "md:grid-cols-1";
  if(cols === 2) return "md:grid-cols-2";
  if(cols === 3) return "md:grid-cols-3";
  if(cols === 4) return "md:grid-cols-4";
  if(cols === 5) return "md:grid-cols-5";
  return "md:grid-cols-3";
};

export const EnhanceTab = ({ savedCards, colCount, viewMode, setActiveCard, setActiveTab, setExpandedId, loadAllData, safeAddress, globalDict }: any) => {
  
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [editContent, setEditContent] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // 💡 [추가] 마지막으로 저장한 카드의 ID를 추적하는 상태
  const [lastEditedId, setLastEditedId] = useState<string | null>(() => {
    try { return localStorage.getItem('blankd_last_edited_enhance_id'); } 
    catch(e) { return null; }
  });

  const [activeTool, setActiveTool] = useState<'editor' | 'smart' | null>(() => {
    return typeof window !== 'undefined' && window.innerWidth < 768 ? 'smart' : 'editor';
  });

  const [showJeonggwanSelector, setShowJeonggwanSelector] = useState(false);

  const [localCards, setLocalCards] = useState<any[]>([]);
  const [movingId, setMovingId] = useState<number | null>(null);

  const enhanceFolders = Array.from(new Set(localCards.map((c:any) => c.folder_name))).filter(f => f && f !== '기본 폴더').sort() as string[];
  
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>(() => {
    try { const saved = localStorage.getItem('blankd_enhance_folders'); return saved ? JSON.parse(saved) : {}; } 
    catch(e) { return {}; }
  });
  
  useEffect(() => {
    if (!movingId && !editingId) {
      setLocalCards(Array.isArray(savedCards) ? savedCards : []);
    }
  }, [savedCards, movingId, editingId]);

  useEffect(() => {
    setOpenFolders(prev => {
      const next = { ...prev }; let changed = false;
      enhanceFolders.forEach(f => { if (next[f] === undefined) { next[f] = true; changed = true; } });
      if (changed) localStorage.setItem('blankd_enhance_folders', JSON.stringify(next)); return next;
    });
  }, [localCards, enhanceFolders]);

  const handleToggleFolder = (f: string) => {
    setOpenFolders(prev => { const next = { ...prev, [f]: !prev[f] }; localStorage.setItem('blankd_enhance_folders', JSON.stringify(next)); return next; });
  };

  const createLongPressHandlers = (callback: () => void, ms = 800) => {
    let timer: any;
    const start = () => { timer = setTimeout(callback, ms); };
    const clear = () => { clearTimeout(timer); };
    return { onTouchStart: start, onTouchEnd: clear, onMouseDown: start, onMouseUp: clear, onMouseLeave: clear, onContextMenu: (e:any) => { e.preventDefault(); callback(); } };
  };

  const triggerMoveApi = async (folder: string, index: number, direction: 'up' | 'down', folderCards: any[]) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newFolderCards = [...folderCards];
    [newFolderCards[index], newFolderCards[targetIndex]] = [newFolderCards[targetIndex], newFolderCards[index]];
    const orderedIds = newFolderCards.map(c => c.id);

    try {
      await fetch("https://api.blankd.top/api/update-order", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wallet_address: safeAddress, table: 'cards', ordered_ids: orderedIds })
      });
    } catch (err) { console.error("순서 변경 실패:", err); }
  };

  const handleMoveCard = async (folder: string, index: number, direction: 'up' | 'down') => {
    const folderCards = localCards.filter((c:any) => c && c.content && c.folder_name === folder);
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === folderCards.length - 1) return;
    
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const card = folderCards[index];
    const targetCard = folderCards[targetIndex];
    
    setLocalCards(prevCards => {
      const next = [...prevCards];
      const g1 = next.findIndex(c => c.id === card.id);
      const g2 = next.findIndex(c => c.id === targetCard.id);
      [next[g1], next[g2]] = [next[g2], next[g1]];
      return next;
    });

    await triggerMoveApi(folder, index, direction, folderCards);
    if (loadAllData) loadAllData();
  };

  useEffect(() => {
    if (!movingId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault();
        setMovingId(null);
        if (loadAllData) loadAllData(); 
        return;
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        setLocalCards(prevCards => {
          const card = prevCards.find(c => c.id === movingId);
          if (!card) return prevCards;
          const folder = card.folder_name;
          const folderCards = prevCards.filter(c => c && c.content && c.folder_name === folder);
          const idx = folderCards.findIndex(c => c.id === movingId);
          
          if (e.key === 'ArrowUp' && idx > 0) {
            const targetCard = folderCards[idx - 1];
            triggerMoveApi(folder, idx, 'up', folderCards);
            const next = [...prevCards];
            const g1 = next.findIndex(c => c.id === card.id);
            const g2 = next.findIndex(c => c.id === targetCard.id);
            [next[g1], next[g2]] = [next[g2], next[g1]];
            setTimeout(() => document.getElementById(`enhance-card-${movingId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
            return next;
          } 
          else if (e.key === 'ArrowDown' && idx < folderCards.length - 1) {
            const targetCard = folderCards[idx + 1];
            triggerMoveApi(folder, idx, 'down', folderCards);
            const next = [...prevCards];
            const g1 = next.findIndex(c => c.id === card.id);
            const g2 = next.findIndex(c => c.id === targetCard.id);
            [next[g1], next[g2]] = [next[g2], next[g1]];
            setTimeout(() => document.getElementById(`enhance-card-${movingId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
            return next;
          }
          return prevCards;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [movingId, safeAddress, loadAllData]);

  const autoApplyDict = (content: string) => {
    if (!globalDict) return content;
    
    const lines = content.split('\n');
    const titleLine = lines[0] || '';
    const restContent = lines.length > 1 ? lines.slice(1).join('\n') : '';

    const stopWords = globalDict.stopwords || [];
    const abbrevKeys = Object.keys(globalDict.abbrs || {}); 
    const abbrevValues = Object.values(globalDict.abbrs || {}); 
    
    const wordsToUnbracket = [...stopWords, ...abbrevKeys];
    const includeWords = Array.from(new Set([
        ...(globalDict.inclusions || []),
        ...(abbrevValues as string[])
    ])).filter((w: any) => typeof w === 'string' && w.trim() !== '').sort((a: any, b: any) => b.length - a.length);

    let currentText = restContent;

    if (wordsToUnbracket.length > 0) {
      currentText = currentText.replace(/\[([^\]]+)\]/g, (match, inner) => {
        let cleanInner = inner.replace(/\s+/g, '');
        if (wordsToUnbracket.some(w => w.replace(/\s+/g, '') === cleanInner)) {
          return inner; 
        }
        return match;
      });
    }

    includeWords.forEach((iw: string) => {
      const chars = iw.replace(/\s+/g, '').split('');
      const flexibleRegexStr = chars.map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*');
      const regex = new RegExp(`\\[[^\\]]+\\]|(${flexibleRegexStr})`, 'gi');
      
      currentText = currentText.replace(regex, (match, p1) => {
        if (match.startsWith('[')) return match; 
        return `[${p1}]`; 
      });
    });

    return titleLine + (lines.length > 1 ? '\n' : '') + currentText;
  };

  const handleWordDelete = async (e: any) => {
    e.preventDefault();
    const input = window.prompt("삭제할 단어나 패턴을 입력하세요.\n(모든 ORIG_ID를 삭제하려면 '[ORIG_ID:*]' 라고 입력하세요)");
    if (!input) return;

    let regex: RegExp;
    if (input.includes('[ORIG_ID:*]') || input.includes('ORIG_ID:*')) {
        regex = /(?:\s+)?(?:\[\[?)?ORIG_ID:\d+(?:\]\]?)?/g;
    } else {
        const escaped = input.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*');
        regex = new RegExp(escaped, 'g');
    }

    const isGlobal = window.confirm(`'${input}' 패턴을 어떻게 삭제하시겠습니까?\n\n[확인] 앱 전체 모든 카드에서 일괄 삭제\n[취소] 현재 열려있는 카드에서만 삭제`);

    if (!isGlobal) {
        setEditContent(prev => prev.replace(regex, '').trim());
        return;
    }

    setIsSaving(true);
    try {
        let changeCount = 0;
        const updateFns: any[] = [];

        for (const card of savedCards) {
            if (!card || !card.content) continue;
            const newContent = card.content.replace(regex, '').trim();
            if (newContent !== card.content) {
                changeCount++;
                const newAnswers = (newContent.match(/\[\s*(.*?)\s*\]/g) || [])
                    .map((b: string) => b.replace(/\[|\]/g, '').trim())
                    .filter(Boolean)
                    .join(", ");

                const payload = {
                    wallet_address: safeAddress || "ENOKI_USER",
                    card_id: parseInt(card.id, 10),
                    card_content: newContent,
                    answer_text: newAnswers,
                    folder_name: card.folder_name,
                    memo: card.memo
                };

                updateFns.push(() => fetch("https://api.blankd.top/api/save-card", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                }));
            }
        }

        if (changeCount > 0) {
            for (let i = 0; i < updateFns.length; i += 5) {
                await Promise.all(updateFns.slice(i, i + 5).map(fn => fn()));
            }
            alert(`✅ 총 ${changeCount}개의 카드에서 해당 단어가 완벽하게 삭제되었습니다.`);
            setEditContent(prev => prev.replace(regex, '').trim());
            if (loadAllData) await loadAllData();
        } else {
            alert("전체 DB에 삭제할 대상이 없습니다.\n(현재 열려있는 카드에만 내용이 반영되었습니다.)");
            setEditContent(prev => prev.replace(regex, '').trim());
        }
    } catch (error) {
        alert("전역 삭제 중 서버 오류가 발생했습니다.");
    } finally {
        setIsSaving(false);
    }
  };

  const handleFindAndReplace = async (e: any) => {
    e.preventDefault();
    const findText = window.prompt("찾을 단어(또는 기호)를 입력하세요:");
    if (!findText) return;

    const replaceText = window.prompt(`'${findText}'을(를) 무엇으로 바꾸시겠습니까?\n(입력하지 않고 확인을 누르시면 삭제 처리됩니다.)`, "") || "";

    const isGlobal = window.confirm(`'${findText}' ➔ '${replaceText}'\n어떻게 변경하시겠습니까?\n\n[확인] 앱 전체 모든 카드에서 일괄 변경\n[취소] 현재 열려있는 카드에서만 변경`);

    const escaped = findText.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'g');

    if (!isGlobal) {
        setEditContent(prev => prev.replace(regex, replaceText));
        return;
    }

    setIsSaving(true);
    try {
        let changeCount = 0;
        const updateFns: any[] = [];

        for (const card of savedCards) {
            if (!card || !card.content) continue;
            const newContent = card.content.replace(regex, replaceText);
            if (newContent !== card.content) {
                changeCount++;
                const newAnswers = (newContent.match(/\[\s*(.*?)\s*\]/g) || [])
                    .map((b: string) => b.replace(/\[|\]/g, '').trim())
                    .filter(Boolean)
                    .join(", ");

                const payload = {
                    wallet_address: safeAddress || "ENOKI_USER",
                    card_id: parseInt(card.id, 10),
                    card_content: newContent,
                    answer_text: newAnswers,
                    folder_name: card.folder_name,
                    memo: card.memo
                };

                updateFns.push(() => fetch("https://api.blankd.top/api/save-card", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                }));
            }
        }

        if (changeCount > 0) {
            for (let i = 0; i < updateFns.length; i += 5) {
                await Promise.all(updateFns.slice(i, i + 5).map(fn => fn()));
            }
            alert(`✅ 총 ${changeCount}개의 카드에서 단어가 완벽하게 변경되었습니다.`);
            setEditContent(prev => prev.replace(regex, replaceText));
            if (loadAllData) await loadAllData();
        } else {
            alert("전체 DB에 변경할 대상이 없습니다.\n(현재 열려있는 카드에만 내용이 반영되었습니다.)");
            setEditContent(prev => prev.replace(regex, replaceText));
        }
    } catch (error) {
        alert("전역 변경 중 서버 오류가 발생했습니다.");
    } finally {
        setIsSaving(false);
    }
  };

  const handleAddAdjacent = (folder: string, index: number) => {
    const folderCards = localCards.filter((c:any) => c && c.content && c.folder_name === folder);
    const origCard = folderCards[index];
    const tempId = `temp_${Date.now()}`;
    const newTitle = '[령/칙/정관] 조항명 입력';
    
    const newCard = {
        id: tempId,
        folder_name: folder,
        content: `${newTitle}\n\n내용을 입력하세요.`, 
        memo: JSON.stringify({ text: "", filled: 0, wrongIndices: [] }),
        answer_text: "",
        isTemp: true,
        insertAfterId: origCard.id
    };

    const nextCards = [...localCards];
    const globalIdx = nextCards.findIndex(c => c.id === origCard.id);
    nextCards.splice(globalIdx + 1, 0, newCard); 
    setLocalCards(nextCards);

    setEditingId(tempId);
    setEditContent(newCard.content);
    setActiveTool(window.innerWidth < 768 ? 'smart' : 'editor');
    setShowJeonggwanSelector(false);
  };

  const handleSaveEdit = async (card: any) => {
    setIsSaving(true); setErrorMsg(null);
    let finalSavedId = card.id; // 💡 저장 성공 시 추적할 ID를 담을 변수
    
    try {
      let sanitizedContent = editContent.replace(/\[+/g, '[').replace(/\]+/g, ']'); 

      const newAnswers = (sanitizedContent.match(/\[\s*(.*?)\s*\]/g) || [])
        .map(b => b.replace(/\[|\]/g, '').trim())
        .filter(Boolean)
        .join(", ");
        
      const isTemp = card.isTemp || typeof card.id === 'string';
      
      const payload = { 
        wallet_address: safeAddress || "ENOKI_USER", 
        card_id: isTemp ? null : parseInt(card.id, 10), 
        card_content: sanitizedContent, 
        answer_text: newAnswers, 
        folder_name: card.folder_name, 
        memo: card.memo 
      };

      const res = await fetch("https://api.blankd.top/api/save-card", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("서버에서 수정 요청 거부됨");

      if (isTemp && card.insertAfterId) {
        const resData = await res.json().catch(()=>({}));
        const newCardId = resData.card_id || resData.id;
        finalSavedId = newCardId || card.id;
        
        const listRes = await fetch(`https://api.blankd.top/api/my-cards?wallet_address=${safeAddress}&t=${Date.now()}`);
        const listData = await listRes.json();
        const allCards = listData.cards || [];
        const folderCards = allCards.filter((c:any) => c.folder_name === card.folder_name);
        
        let createdCard = newCardId ? folderCards.find((c:any) => c.id === newCardId) : folderCards.filter((c:any) => c.content === sanitizedContent).pop();
        if (createdCard) finalSavedId = createdCard.id;
        
        if (createdCard) {
            const otherFolderCards = folderCards.filter((c:any) => c.id !== createdCard.id);
            const targetIdx = otherFolderCards.findIndex((c:any) => c.id === card.insertAfterId);
            if (targetIdx !== -1) {
                otherFolderCards.splice(targetIdx + 1, 0, createdCard);
                const orderedIds = otherFolderCards.map((c:any) => c.id);
                await fetch("https://api.blankd.top/api/update-order", {
                    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wallet_address: safeAddress, table: 'cards', ordered_ids: orderedIds })
                });
            }
        }
      } else {
        card.content = sanitizedContent; card.answer_text = newAnswers;
      }
      
      if (typeof loadAllData === 'function') await loadAllData();
      setEditingId(null); 
      setShowJeonggwanSelector(false);

      // 💡 [v 표시 연동] 성공적으로 수정이 완료되면 로컬스토리지와 상태 업데이트
      setLastEditedId(String(finalSavedId));
      localStorage.setItem('blankd_last_edited_enhance_id', String(finalSavedId));

    } catch (error: any) { setErrorMsg(error.message || "서버 통신 실패"); } finally { setIsSaving(false); }
  };

  const renderInteractiveText = () => {
    const lines = editContent.split('\n');
    const titleLine = (lines[0] || '').replace(/\[(법|령|칙|규|정관)\]/g, '').trim();
    const restLines = lines.slice(1).join('\n');
    
    const tokens = restLines.split(/(\s+|\n|---|\[[^\]]+\])/g).filter(Boolean);

    return (
      <div className={`w-full bg-black/40 p-4 rounded border border-white/10 leading-loose font-sans ${activeTool ? 'select-none' : ''} min-h-[160px] max-h-[400px] overflow-y-auto custom-scrollbar`}>
        <div className="text-amber-400 font-bold mb-2 pb-2 border-b border-white/10 select-none opacity-70 cursor-not-allowed">
          {titleLine}
        </div>
        {tokens.map((token, idx) => {
          const isBracketed = token.startsWith('[') && token.endsWith(']');
          const isPageBreak = token === '---';
          const isNewline = token === '\n';
          const isWhitespace = /^\s+$/.test(token);
          
          if (isPageBreak) return <div key={idx} className="my-6 border-b-2 border-dashed border-white/20 relative flex justify-center cursor-default"><span className="absolute -top-3 bg-[#0a0a0c] px-3 py-0.5 rounded-full text-[10px] text-white/40 font-bold border border-white/10">✂️ PAGE BREAK (---)</span></div>;
          if (isNewline) return <br key={idx} />;
          if (isWhitespace) return <span key={idx}>{token}</span>;

          let btnClass = "inline-block rounded px-1.5 py-0.5 mx-0.5 transition-all ";
          
          if (activeTool === 'smart') {
            if (isBracketed) btnClass += "bg-teal-900/60 text-teal-200 border border-teal-500/60 cursor-pointer hover:bg-red-600/80 hover:text-white hover:border-red-400 shadow-md hover:scale-105 active:scale-95";
            else btnClass += "text-white/80 cursor-pointer bg-white/5 hover:bg-teal-500/40 hover:text-white border border-transparent hover:border-teal-400/50 shadow-sm hover:scale-105 active:scale-95";
          } else {
            if (isBracketed) btnClass += "bg-teal-900/30 text-teal-400 border border-teal-500/30 cursor-default";
            else btnClass += "text-white/77 cursor-default";
          }

          return (
            <span 
              key={idx} 
              onClick={(e) => {
                if (activeTool !== 'smart') return;
                e.preventDefault();
                
                if (e.shiftKey) {
                  let currentText = isBracketed ? token.slice(1, -1) : token;
                  if (currentText.includes(' ')) {
                     const parts = currentText.split(/(\s+)/);
                     let replacement = "";
                     parts.forEach(p => {
                         if (/^\s+$/.test(p)) replacement += p; 
                         else replacement += isBracketed ? `[${p}]` : p;
                     });
                     const newTokens = [...tokens];
                     newTokens[idx] = replacement;
                     setEditContent(lines[0] + '\n' + newTokens.join(''));
                  }
                  return;
                }

                const newTokens = [...tokens]; 
                newTokens[idx] = isBracketed ? token.slice(1, -1) : `[${token}]`; 
                setEditContent(lines[0] + '\n' + newTokens.join(''));
              }} 
              onContextMenu={(e) => {
                if (activeTool !== 'smart') return;
                e.preventDefault();
                
                let nextIdx = idx + 1;
                let spaces = "";
                while (nextIdx < tokens.length) {
                   if (tokens[nextIdx] === '---' || tokens[nextIdx] === '\n') return; 
                   if (/^\s+$/.test(tokens[nextIdx])) { 
                       spaces += tokens[nextIdx]; 
                       nextIdx++; 
                   } else {
                       break; 
                   }
                }
                
                if (nextIdx < tokens.length) {
                   const newTokens = [...tokens];
                   let currentText = isBracketed ? token.slice(1, -1) : token;
                   let nextText = tokens[nextIdx].startsWith('[') && tokens[nextIdx].endsWith(']') ? tokens[nextIdx].slice(1, -1) : tokens[nextIdx];
                   
                   let merged = currentText + spaces + nextText;
                   newTokens[idx] = isBracketed ? `[${merged}]` : merged; 
                   
                   for (let i = idx + 1; i <= nextIdx; i++) {
                       newTokens[i] = ""; 
                   }
                   setEditContent(lines[0] + '\n' + newTokens.join(''));
                }
              }}
              className={btnClass}
              title={activeTool === 'smart' ? "좌클릭: 토글 / 우클릭: 합치기 / Shift+클릭: 분리" : ""}
            >
              {isBracketed ? token.slice(1, -1) : token}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in w-full">
      <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4 sm:mb-6">
        {enhanceFolders.map((f: string) => (
          <button key={f} onClick={() => handleToggleFolder(f)} className={`px-3 py-1.5 sm:py-2 text-[10px] sm:text-[12px] font-bold border rounded-sm transition-all ${openFolders[f] ? 'bg-teal-600 border-teal-500 text-white shadow-sm' : 'bg-teal-900/40 text-teal-300 border-teal-500/30'}`}>
            📁 {f}
          </button>
        ))}
      </div>
      
      {enhanceFolders.map((folder: string) => openFolders[folder] && (
        <div key={folder} className="mb-6 sm:mb-8 border-l border-white/5 pl-2 sm:pl-3">
          <div className="text-xs sm:text-sm text-white/50 mb-2 sm:mb-3 border-b border-white/10 pb-1.5 sm:pb-2 font-bold">{folder}</div>
          <div className={`grid grid-cols-1 ${getGridClass(colCount)} gap-1.5 sm:gap-2 items-start`}>
            {localCards.filter((c:any) => c && c.content && c.folder_name === folder).map((card: any, idx: number, folderCards: any[]) => {
                try {
                  const cleanContent = card.content.replace(/\s*\[\[?ORIG_ID:\d+\]?\]?/g, '');
                  
                  let displayTitle = (cleanContent.split('\n')[0] || "")
                    .replace(/\[(법|령|칙|규|정관)\]/g, '')
                    .replace(/\(\s*내용\s*\)/g, '')
                    .replace(/내용/g, '')
                    .trim();
                  if (!displayTitle) displayTitle = "제목 없음";

                  let colClass = "md:col-start-1 md:col-span-1"; 
                  let titleColor = "text-red-500";
                  
                  if (cleanContent.includes('[정관]')) {
                    colClass = "md:col-start-1 md:col-span-1"; titleColor = "text-yellow-500";
                  } else if (cleanContent.includes('[칙]') || cleanContent.includes('[규]')) { 
                    colClass = "md:col-start-3 md:col-span-1"; titleColor = "text-green-500";
                  } else if (cleanContent.includes('[령]')) { 
                    colClass = "md:col-start-2 md:col-span-1"; titleColor = "text-blue-400";
                  } else { 
                    colClass = "md:col-start-1 md:col-span-1"; titleColor = "text-red-500";
                  }

                  const lines = cleanContent.split('\n');
                  const bodyOnlyForStats = lines.slice(1).join('\n');
                  const totalBlanks = (bodyOnlyForStats.match(/\[\s*(.*?)\s*\]/g) || []).length;
                  const stats = parseCardStats(card.memo);
                  const hasWrong = stats.wrongIndices.length > 0;

                  if (editingId === card.id) colClass = "col-span-full";

                  const titleLen = displayTitle.length;
                  const titleSizing = titleLen > 25 ? 'text-[10px] sm:text-[11px] tracking-[calc(-0.06em)]' : 
                                      titleLen > 15 ? 'text-[11px] sm:text-[12px] tracking-tighter' : 
                                      'text-[12px] sm:text-[13px] tracking-tight';

                  // 💡 이 카드가 마지막으로 수정된 카드인지 판별
                  const isLastEdited = String(lastEditedId) === String(card.id);

                  return (
                    <div key={card.id} id={`enhance-card-${card.id}`} className={`relative transition-all w-full ${colClass}`}>
                      {editingId === card.id ? (
                        <div className="relative flex flex-col p-4 rounded-sm border border-amber-500/50 bg-[#0a0a0c] transition-all duration-300 w-full shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                          
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-3">
                            <span className="text-[12px] text-amber-500 font-bold flex items-center gap-2">빈칸 직접 수정 모드</span>
                            
                            <div className="flex flex-col sm:flex-row items-center gap-2 bg-black/50 p-1.5 rounded-sm border border-white/10">
                              <div className="flex gap-1 items-center">
                                <button onClick={(e) => {
                                  e.preventDefault();
                                  let stripped = editContent.replace(/\[|\]/g, ''); 
                                  setEditContent(autoApplyDict(stripped)); 
                                }} className="px-2 py-1 rounded-sm text-[10px] font-bold bg-blue-900/30 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 transition-all shadow-sm">
                                  🪄 사전 기준 전면 재적용
                                </button>
                                <div className="w-px h-3 bg-white/10 mx-0.5"></div>
                                
                                <button onClick={handleWordDelete} className="px-2 py-1 rounded-sm text-[10px] font-bold bg-red-900/30 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-all shadow-sm">
                                  🗑️ 단어삭제
                                </button>
                                <div className="w-px h-3 bg-white/10 mx-0.5"></div>

                                <button onClick={handleFindAndReplace} className="px-2 py-1 rounded-sm text-[10px] font-bold bg-indigo-900/30 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20 transition-all shadow-sm">
                                  🔄 찾아바꾸기
                                </button>
                                <div className="w-px h-3 bg-white/10 mx-0.5"></div>

                                <button onClick={() => setActiveTool(activeTool === 'editor' ? null : 'editor')} className={`px-2 py-1 rounded-sm text-[10px] font-bold ${activeTool === 'editor' ? 'bg-amber-500/80 text-white' : 'bg-white/5 text-white/50'}`}>직접 타이핑</button>
                                <button onClick={() => setActiveTool(activeTool === 'smart' ? null : 'smart')} className={`px-2 py-1 rounded-sm text-[10px] font-bold ${activeTool === 'smart' ? 'bg-teal-500/80 text-white' : 'bg-white/5 text-white/50'}`}>스마트 클릭</button>
                                <button onClick={() => setShowJeonggwanSelector(!showJeonggwanSelector)} className={`px-2 py-1 rounded-sm text-[10px] font-bold transition-all ${showJeonggwanSelector ? 'bg-yellow-500 text-black' : 'bg-yellow-900/30 text-yellow-500 border border-yellow-500/30 hover:bg-yellow-500/20'}`}>📜 정관 불러오기</button>
                              </div>
                              {activeTool === 'smart' && (
                                <span className="text-[9px] text-teal-300/80 ml-1 hidden sm:inline-block">좌클릭:토글 / 우클릭:합치기 / Shift+클릭:분리</span>
                              )}
                            </div>
                          </div>

                          {showJeonggwanSelector && (
                            <div className="mb-3 p-2 bg-yellow-950/20 border border-yellow-500/30 rounded-sm animate-in fade-in flex items-center gap-2 shadow-inner">
                              <select
                                className="flex-1 bg-black/80 text-yellow-400 text-[11px] p-2 outline-none border border-yellow-500/50 rounded-sm custom-scrollbar cursor-pointer focus:ring-1 focus:ring-yellow-500"
                                onChange={(e) => {
                                  if (!e.target.value) return;
                                  const targetCard = localCards.find(c => String(c.id) === String(e.target.value));
                                  if (targetCard) {
                                    const lines = targetCard.content.split('\n');
                                    let firstLine = lines[0].replace(/\[(법|령|칙|규|정관)\]/g, '').trim();
                                    lines[0] = `[정관] ${firstLine}`; 
                                    setEditContent(lines.join('\n'));
                                    setShowJeonggwanSelector(false); 
                                  }
                                }}
                                defaultValue=""
                              >
                                <option value="" disabled>⬇️ 정관 폴더에서 가져올 조항을 선택하세요</option>
                                {localCards.filter(c => c.folder_name === '정관').map(c => (
                                  <option key={c.id} value={c.id}>
                                    {c.content.split('\n')[0].replace(/\[.*?\]/g, '').trim() || "제목 없음"}
                                  </option>
                                ))}
                              </select>
                              <button onClick={() => setShowJeonggwanSelector(false)} className="px-3 py-1.5 bg-white/5 text-white/50 text-[10px] rounded-sm hover:bg-white/10 hover:text-white transition-colors">✕ 닫기</button>
                            </div>
                          )}
                          
                          {activeTool === 'editor' ? (
                            <textarea value={editContent} onChange={(e) => { setEditContent(e.target.value); }} className="w-full min-h-[160px] max-h-[400px] bg-black/60 text-amber-50 text-[12px] p-4 rounded border border-white/10 outline-none resize-none custom-scrollbar" placeholder="직접 입력하거나 [ ] 기호로 감싸세요. (아예 띄어쓰기가 없는 문장에 빈 공간을 넣을 땐 여기서 입력하세요.)" />
                          ) : renderInteractiveText()}
                          
                          {errorMsg && <div className="text-red-400 text-[10px] mt-3 font-bold">{errorMsg}</div>}
                          
                          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-white/10">
                            <button onClick={(e) => { e.stopPropagation(); setEditingId(null); setShowJeonggwanSelector(false); if(card.isTemp) { setLocalCards(prev=>prev.filter(c=>c.id!==card.id)); } }} className="px-4 py-1.5 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 rounded-sm text-[11px] font-bold transition-all">취소</button>
                            <button onClick={(e) => { e.stopPropagation(); handleSaveEdit(card); }} className="px-5 py-1.5 bg-amber-600 text-white hover:bg-amber-500 rounded-sm text-[11px] font-bold transition-all">{isSaving ? '저장 중...' : '내용 저장'}</button>
                          </div>
                        </div>
                      ) : (
                        <button {...createLongPressHandlers(() => (card.id))} onClick={(e) => { e.stopPropagation(); if (typeof setActiveCard === 'function') setActiveCard(card); }} className={`w-full p-1.5 sm:p-2 rounded-sm border flex flex-col justify-center gap-0.5 ${movingId === card.id ? "border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)] bg-blue-900/30 ring-2 ring-blue-500/50" : hasWrong ? "border-red-500/40 bg-red-900/20" : "border-indigo-500/30 bg-indigo-900/20 hover:bg-indigo-900/40"} shadow-sm transition-all duration-200`}>
                          
                          <div className="flex w-full overflow-hidden mb-1 items-center">
                            <div className={`${titleColor} font-bold ${titleSizing} w-full text-left truncate leading-tight`} title={displayTitle}>
                              {displayTitle}
                              {/* 💡 [표시] 마지막으로 수정한 카드 v 체크 표시 */}
                              {isLastEdited && (
                                <span className="ml-1.5 inline-flex items-center justify-center text-green-400 font-black text-[9px] bg-green-900/40 px-1 py-0.5 rounded-sm border border-green-500/30 align-middle shadow-sm" title="마지막으로 수정한 카드">v</span>
                              )}
                            </div>
                          </div>
                          
                          {movingId === card.id ? (
                            <div className="flex items-center justify-between w-full pt-1 animate-in fade-in">
                              <span className="text-blue-300 text-[10px] font-bold flex items-center">
                                방향키(↑, ↓)로 이동 후 Enter 입력
                              </span>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setMovingId(null); if(loadAllData) loadAllData(); }} 
                                className="px-2 py-0.5 bg-blue-500 text-white text-[9px] font-bold rounded-sm shadow-md hover:bg-blue-400 transition-colors"
                              >
                                완료
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col w-full pt-1 border-t border-white/5">
                              <div className="flex flex-row justify-between items-center w-full">
                                <div className="flex flex-nowrap gap-0.5">
                                  <span className="text-[7px] sm:text-[8px] text-indigo-300 px-1 py-[1px] rounded font-mono whitespace-nowrap leading-none flex items-center">빈칸:{totalBlanks}</span>
                                  <span className="text-[7px] sm:text-[8px] text-teal-300 px-1 py-[1px] rounded font-mono whitespace-nowrap leading-none flex items-center">반복:{stats.filled}</span>
                                  <span className={`text-[7px] sm:text-[8px] px-1 py-[1px] rounded font-mono whitespace-nowrap leading-none flex items-center ${hasWrong ? 'text-white bg-red-600 font-bold animate-pulse shadow-sm' : 'text-white/30 bg-black/20'}`}>틀림:{stats.wrongIndices.length}</span>
                                </div>
                                <div className="flex items-center gap-0.5 opacity-80 hover:opacity-100 transition-opacity">
                                  <button onClick={(e) => { e.stopPropagation(); setMovingId(card.id); }} className="px-1.5 py-0.5 bg-white/5 text-white/50 rounded-sm font-mono text-[9px] hover:bg-blue-500/10 hover:text-blue-500 transition-all cursor-pointer flex items-center justify-center leading-none h-4" title="이동">↕️</button>
                                  <button onClick={(e) => { e.stopPropagation(); handleAddAdjacent(folder, idx); }} className="px-1.5 py-0.5 bg-white/5 text-white/50 rounded-sm font-mono text-[10px] font-bold hover:bg-green-500/10 hover:text-green-600 transition-all cursor-pointer flex items-center justify-center leading-none h-4" title="추가">+</button>
                                  <button onClick={(e) => { e.stopPropagation(); setEditingId(card.id); setEditContent(card.content); setActiveTool(window.innerWidth < 768 ? 'smart' : 'editor'); setShowJeonggwanSelector(false); }} className="px-1.5 py-0.5 bg-white/5 text-white/50 rounded-sm font-mono text-[9px] hover:bg-amber-500/10 hover:text-amber-600 transition-all flex items-center justify-center leading-none h-4" title="수정">✏️</button>
                                  <button onClick={async (e) => { e.stopPropagation(); if (confirm(`'${displayTitle}' 카드를 정말 삭제하시겠습니까?`)) { try { const res = await fetch("https://api.blankd.top/api/delete-card", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wallet_address: safeAddress, id: card.id, card_id: card.id }) }); if (!res.ok) throw new Error(); if (loadAllData) await loadAllData(); } catch (err) { alert("카드 삭제에 실패했습니다."); } } }} className="ml-0.5 px-1.5 py-0.5 bg-white/5 text-white/50 rounded-sm font-mono text-[8px] hover:bg-red-500/10 hover:text-red-500 transition-all flex items-center justify-center leading-none h-4" title="삭제">✕</button>
                                </div>
                              </div>
                            </div>
                          )}
                        </button>
                      )}
                    </div>
                  );
                } catch (renderError: any) { return <div key={card.id || Math.random()} className="text-red-500 text-xs p-2 border border-red-500/50 bg-red-900/20">카드 렌더링 오류 진단: {renderError.message}</div>; }
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
