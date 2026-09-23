import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  History,
  MessageCircle,
  Check,
  ArrowUpRight,
} from "lucide-react";
import { Header } from "../components/Shell";
export default function Home() {
  return (
    <>
      <Header />
      <main className="landing">
        <div className="eyebrow">
          <span className="live-dot" /> 생각의 흔적을 만나는 새로운 글쓰기
        </div>
        <section className="hero">
          <div>
            <p className="overline">EVERY THOUGHT HAS A STORY</p>
            <h1>
              완성된 글 너머,
              <br />
              <em>생각의 과정</em>을 봅니다.
            </h1>
            <p className="hero-copy">
              첫 문장부터 마지막 고쳐쓰기까지.
              <br />
              학생이 쌓아온 생각을 기록하고,
              <br />
              선생님이 꼭 읽어야 할 대목으로 연결합니다.
            </p>
            <div className="hero-actions">
              <Link className="button primary" href="/teacher">
                교사 공간 시작하기 <ArrowRight size={18} />
              </Link>
              <a href="#how" className="text-link">
                어떻게 기록하나요? <ArrowUpRight size={16} />
              </a>
            </div>
            <div className="hero-meta">
              <span>
                <Check size={15} /> AI API 없이 과정 기록
              </span>
              <span>
                <Check size={15} /> 학생의 목소리 우선
              </span>
            </div>
          </div>
          <div className="hero-illustration" aria-label="작성 과정 소개 예시">
            <div className="floating-note">
              <span className="live-dot" /> 작은 수정에도 생각이 담겨 있어요.
            </div>
            <div className="paper">
              <div className="paper-top">
                <span>생각의 흔적</span>
                <span>01 — 03</span>
              </div>
              <h2>처음에는 몰랐던 것</h2>
              <p>
                책을 읽기 전에는 용기란
                <br />
                <s>두려움이 없는 것</s>이라고 생각했다.
              </p>
              <p>
                하지만 지금은 조금 다르게 느낀다.
                <br />
                <mark>두려워도 한 걸음 내딛는 것.</mark>
                <br />
                그것이 내가 발견한 용기다.
              </p>
              <div className="paper-line" />
              <div className="paper-caption">
                <span className="small-icon">
                  <MessageCircle size={17} />
                </span>
                <span>
                  선생님께 꼭 보여주고 싶은 대목
                  <br />
                  <small>“처음 생각이 달라진 부분이에요.”</small>
                </span>
              </div>
            </div>
            <div className="mini-timeline">
              <span>첫 생각</span>
              <i />
              <b />
              <i />
              <b />
              <i />
              <span>새로운 발견</span>
            </div>
            <div className="example-label">
              서비스 흐름을 설명하는 예시입니다.
            </div>
          </div>
        </section>
        <section id="how" className="how">
          <div className="section-top">
            <span className="overline">PROCESS, NOT PREDICTION</span>
            <h2>기록은 도구가, 이해는 선생님이.</h2>
            <p>결과물을 검사하지 않습니다. 만들어지는 과정을 증명합니다.</p>
          </div>
          <div className="feature-grid">
            <article>
              <span className="feature-icon">
                <History />
              </span>
              <span className="step-no">01</span>
              <h3>생각이 쌓이는 글쓰기</h3>
              <p>
                작성과 수정, 자료를 붙여넣고 다듬은 흐름을 시간순으로 남깁니다.
              </p>
            </article>
            <article>
              <span className="feature-icon">
                <BookOpen />
              </span>
              <span className="step-no">02</span>
              <h3>꼭 읽어야 할 대목</h3>
              <p>
                학생이 고른 한 문장과 고쳐 쓴 대목에서 의미 있는 읽기를
                시작합니다.
              </p>
            </article>
            <article>
              <span className="feature-icon">
                <MessageCircle />
              </span>
              <span className="step-no">03</span>
              <h3>다시 이어지는 대화</h3>
              <p>
                글의 구체적인 대목에 피드백을 전하고, 학생이 다시 써본 생각을
                함께 읽습니다.
              </p>
            </article>
          </div>
        </section>
        <div className="principle">
          <span>OUR PROMISE</span>
          <p>
            과정증거 점수는 AI 사용이나 본인 작성 확률이 아닙니다.
            <br />
            학생을 판단하는 대신, 글을 이해할 근거를 제공합니다.
          </p>
        </div>
      </main>
      <footer>
        <span>ProofWrite · FREE v0.1 Pilot</span>
        <span>생각은 학생에게, 판단은 교사에게.</span>
      </footer>
    </>
  );
}
