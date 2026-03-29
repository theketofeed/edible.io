import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  LayoutDashboard, Calendar, BookmarkCheck, Heart, Sparkles,
  User, LogOut, ChevronRight, Plus, Search, Bell, Trash2,
  Clock, UtensilsCrossed, X, Flame, ArrowUpRight,
  ClipboardList, CalendarDays, Utensils,
  Sunrise, Sun, Moon,
  Scale, Leaf, Dumbbell, Wheat, Sprout,
  Camera, PencilLine
} from "lucide-react"
import logo from "../assets/Transparent logo.png"
import { useAuth } from "../context/AuthContext"
import { getUserMealPlans, getProfile } from "../lib/db"
import type { MealPlanResult } from "../utils/types"

const C = {
  white:"#FFFFFF",
  sideBdr:"#EDEBE7",
  // Match homepage CTA lavender
  accent:"#C6A0F6",
  accentDark:"#B58DF5",
  // Primary lavender accent (matches homepage "Try Edible for Free")
  purple:"#C6A0F6",
  bg:"#F5F3EF",
  cardBdr:"#EDE9E2",
  txt:"#111827",
  muted:"#6B7280",
  faint:"#9CA3AF",
  green:"#10b981",
  red:"#ef4444",
}

type DietKey = "All"|"Balanced"|"Keto"|"Vegan"|"High-Protein"|"Mediterranean"|"Vegetarian"|"Paleo"
type UserData = { name: string; email: string; joined: string }
const DEFAULT_USER_DATA: UserData = { name:"User", email:"user@edible.io", joined:"2026" }
const DIET: Record<DietKey, { icon: React.ElementType; col: string; bg: string }> = {
  All:            { icon: Sparkles, col: C.purple, bg: "#F5F3FF" },
  Balanced:       { icon: Scale, col: "#16a34a", bg: "#F0FDF4" },
  Keto:           { icon: Flame, col: "#b45309", bg: "#FEFCE8" },
  Vegan:          { icon: Leaf, col: "#047857", bg: "#ECFDF5" },
  "High-Protein": { icon: Dumbbell, col: "#dc2626", bg: "#FEF2F2" },
  Mediterranean:  { icon: Wheat, col: "#1d4ed8", bg: "#EFF6FF" },
  Vegetarian:     { icon: Sprout, col: "#15803d", bg: "#F0FDF4" },
  Paleo:          { icon: UtensilsCrossed, col: "#c2410c", bg: "#FFF7ED" },
}

const USER_DATA = { name:"Sarah Mitchell", email:"sarah@edible.io", joined:"Jan 2026" }

type MealSlot = { name: string; cal: number }
type PlanDay = { day: string; B: MealSlot; L: MealSlot; D: MealSlot }
type Plan = { id: string; title: string; diet: DietKey; date: string; days: PlanDay[] }

const PLANS: Plan[] = [
  { id:"p1", title:"Spring Clean Week", diet:"Balanced", date:"2026-03-18",
    days:[
      { day:"Mon", B:{name:"Avocado Toast",cal:340}, L:{name:"Quinoa Bowl",cal:420}, D:{name:"Grilled Salmon",cal:580} },
      { day:"Tue", B:{name:"Greek Yogurt Parfait",cal:280}, L:{name:"Turkey Wrap",cal:360}, D:{name:"Chicken Stir-Fry",cal:520} },
      { day:"Wed", B:{name:"Smoothie Bowl",cal:310}, L:{name:"Caprese Salad",cal:320}, D:{name:"Pasta Primavera",cal:490} },
    ]},
  { id:"p2", title:"Keto Week 3", diet:"Keto", date:"2026-03-10",
    days:[
      { day:"Mon", B:{name:"Bacon & Eggs",cal:480}, L:{name:"Tuna Salad",cal:390}, D:{name:"Ribeye + Broccoli",cal:720} },
      { day:"Tue", B:{name:"Chia Pudding",cal:290}, L:{name:"Cobb Salad",cal:450}, D:{name:"Pork Tenderloin",cal:580} },
    ]},
  { id:"p3", title:"Vegan Reset", diet:"Vegan", date:"2026-03-01",
    days:[
      { day:"Mon", B:{name:"Green Smoothie",cal:280}, L:{name:"Buddha Bowl",cal:410}, D:{name:"Lentil Curry",cal:490} },
      { day:"Tue", B:{name:"Oatmeal & Berries",cal:310}, L:{name:"Tofu Banh Mi",cal:390}, D:{name:"Black Bean Tacos",cal:440} },
      { day:"Wed", B:{name:"Acai Bowl",cal:340}, L:{name:"Chickpea Salad",cal:350}, D:{name:"Mushroom Risotto",cal:520} },
      { day:"Thu", B:{name:"PB Toast",cal:360}, L:{name:"Minestrone Soup",cal:290}, D:{name:"Stuffed Peppers",cal:430} },
    ]},
]

type Recipe = { id: string; title: string; type: string; time: number; cal: number }
const RECIPES: Recipe[] = [
  { id:"r1", title:"Lemon Herb Salmon",      type:"Dinner",    time:25, cal:420 },
  { id:"r2", title:"Quinoa Buddha Bowl",      type:"Lunch",     time:20, cal:380 },
  { id:"r3", title:"Avocado Toast & Eggs",    type:"Breakfast", time:10, cal:340 },
  { id:"r4", title:"Chicken Stir-Fry",        type:"Dinner",    time:30, cal:520 },
  { id:"r5", title:"Greek Yogurt Parfait",    type:"Breakfast", time:5,  cal:280 },
  { id:"r6", title:"Turkey Lettuce Wraps",    type:"Lunch",     time:15, cal:310 },
]

const WEEK  = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
const DATES = [23,24,25,26,27,28,29]
const TODAY = 1

type PlannerMeal = { type: string; name: string; cal: number; time: number }
type PlannerData = Record<number, PlannerMeal[]>
const PLANNER: PlannerData = {
  0:[{type:"Breakfast",name:"Avocado Toast",cal:340,time:10},{type:"Lunch",name:"Quinoa Bowl",cal:420,time:20},{type:"Dinner",name:"Grilled Salmon",cal:580,time:30}],
  1:[{type:"Breakfast",name:"Greek Yogurt Parfait",cal:280,time:5},{type:"Lunch",name:"Turkey Wrap",cal:360,time:15}],
  2:[{type:"Breakfast",name:"Smoothie Bowl",cal:310,time:8}],
  3:[],4:[],5:[],6:[]
}

const MBG:  Record<string,string> = {
  Breakfast:"#FEF3C7",
  Lunch:"#D1FAE5",
  // Keep dinner accent within the lavender family
  Dinner:"#F5F3FF"
}
const MCOL: Record<string,string> = { Breakfast:"#92400E", Lunch:"#065F46", Dinner:C.purple }
const MICON:Record<string, React.ElementType> = { Breakfast:Sunrise, Lunch:Sun, Dinner:Moon }

// ─── Sidebar ──────────────────────────────────────────────────────────────────
type NavId = "overview"|"planner"|"plans"|"recipes"|"generate"|"profile"|"logout"
interface SidebarProps { active: string; onNav: (id: NavId) => void; userData: UserData }

function Sidebar({ active, onNav, userData }: SidebarProps) {
  const main = [
    { id:"overview" as NavId, icon:LayoutDashboard, label:"Overview"      },
    { id:"planner"  as NavId, icon:Calendar,        label:"Meal Planner"  },
    { id:"plans"    as NavId, icon:BookmarkCheck,   label:"Saved Plans"   },
    { id:"recipes"  as NavId, icon:Heart,           label:"Saved Recipes" },
    { id:"generate" as NavId, icon:Sparkles,        label:"Generate Plan" },
  ]
  const settings = [
    { id:"profile" as NavId, icon:User,   label:"Profile",  danger:false },
    { id:"logout"  as NavId, icon:LogOut, label:"Log Out",  danger:true  },
  ]

  function Item({ item }: { item: { id: NavId; icon: React.ElementType; label: string; danger?: boolean } }) {
    const on = active === item.id
    return (
      <button onClick={() => onNav(item.id)} style={{
        width:"100%", display:"flex", alignItems:"center", gap:9, padding:"7px 10px",
        borderRadius:10, border:"none", cursor:"pointer", marginBottom:1,
        background: on ? "rgba(198,160,246,0.10)" : "transparent",
        color: on ? C.txt : item.danger ? C.red : C.muted,
        fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight: on ? 700 : 500, fontSize:13,
        textAlign:"left", transition:"all .12s",
        borderLeft: on ? `3px solid ${C.accentDark}` : "3px solid transparent",
      }}
        onMouseEnter={e => { if (!on) (e.currentTarget as HTMLElement).style.background = "#F9F8F6" }}
        onMouseLeave={e => { if (!on) (e.currentTarget as HTMLElement).style.background = "transparent" }}
      >
        <span style={{width:28,height:28,borderRadius:8,display:"flex",alignItems:"center",
          justifyContent:"center",flexShrink:0,
          background: on ? "rgba(181,141,245,0.22)" : "rgba(0,0,0,0.04)"}}>
          <item.icon size={13} />
        </span>
        {item.label}
        {on && <div style={{marginLeft:"auto",width:5,height:5,borderRadius:"50%",background:C.accentDark}} />}
      </button>
    )
  }

  return (
    <aside style={{width:220,background:C.white,display:"flex",flexDirection:"column",
      height:"100%",borderRight:`1px solid ${C.sideBdr}`,flexShrink:0}}>
      <div style={{padding:"18px 16px 14px",borderBottom:`1px solid ${C.sideBdr}`}}>
        <div style={{display:"flex",alignItems:"center",gap:9}}>
          <img
            src={logo}
            alt="Edible.io"
            style={{width:32,height:32,objectFit:"contain"}}
          />
          <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:16,fontWeight:800,color:C.txt}}>
            Edible<span style={{color:C.accent}}>.io</span>
          </span>
        </div>
      </div>
      <div style={{padding:"12px 12px 6px"}}>
        <button onClick={() => onNav("generate")} style={{
          width:"100%",background:C.accent,color:"white",padding:"9px 12px",
          borderRadius:10,fontWeight:700,fontSize:12.5,border:"none",cursor:"pointer",
          display:"flex",alignItems:"center",justifyContent:"center",gap:6,
          fontFamily:"'Plus Jakarta Sans',sans-serif",boxShadow:"0 4px 14px rgba(198,160,246,0.4)"}}>
          <Plus size={14} /> Generate Plan
        </button>
      </div>
      <nav style={{padding:"6px 10px"}}>
        <p style={{fontSize:9.5,fontWeight:700,color:C.faint,letterSpacing:".12em",
          textTransform:"uppercase",padding:"8px 10px 5px"}}>Main Menu</p>
        {main.map(i => <Item key={i.id} item={i} />)}
      </nav>
      <div style={{flex:1}} />
      <nav style={{padding:"0 10px 6px",borderTop:`1px solid ${C.sideBdr}`}}>
        <p style={{fontSize:9.5,fontWeight:700,color:C.faint,letterSpacing:".12em",
          textTransform:"uppercase",padding:"10px 10px 5px"}}>Settings</p>
        {settings.map(i => <Item key={i.id} item={i} />)}
      </nav>
      <div style={{padding:"10px 12px 14px",borderTop:`1px solid ${C.sideBdr}`}}>
        <div style={{display:"flex",alignItems:"center",gap:9,padding:"6px 8px",
          borderRadius:10,background:"#F9F8F6"}}>
          <div style={{width:30,height:30,borderRadius:9,flexShrink:0,
            background:`linear-gradient(135deg,${C.accent},${C.accentDark})`,
            display:"flex",alignItems:"center",justifyContent:"center"}}>
            <img
              src={logo}
              alt="Edible.io"
              style={{width:18,height:18,objectFit:"contain",filter:"brightness(0) invert(1)"}}
            />
          </div>
          <div style={{flex:1,minWidth:0}}>
            <p style={{color:C.txt,fontSize:11.5,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{userData.name}</p>
            <p style={{color:C.faint,fontSize:10,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{userData.email}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

// ─── Overview ─────────────────────────────────────────────────────────────────
interface OverviewProps { plans: Plan[]; onNav: (id: NavId) => void; userData: UserData }

function Overview({ plans, onNav, userData }: OverviewProps) {
  const totalDays  = plans.reduce((a, p) => a + p.days.length, 0)
  const totalMeals = totalDays * 3
  const todayMeals = PLANNER[TODAY] || []
  const consumed   = todayMeals.reduce((a, m) => a + m.cal, 0)
  const target     = 1800
  const r = 44, cx = 60, cy = 60, circ = 2 * Math.PI * r
  const dash = Math.min(consumed / target, 1) * circ
  const now = new Date()
  const weekday = now.toLocaleDateString("en-US", { weekday: "long" })
  const monthDay = now.toLocaleDateString("en-US", { month: "long", day: "numeric" })
  return (
    <div>
      <div style={{background:C.white,
        borderRadius:20,padding:"26px 26px 34px",marginBottom:0,position:"relative",overflow:"hidden",
        border:`1px solid rgba(198,160,246,0.25)`}}>
        <div style={{position:"absolute",top:-40,right:-40,width:180,height:180,
          borderRadius:"50%",background:"rgba(255,255,255,0.08)"}} />
        <div style={{position:"absolute",bottom:-20,left:60,width:100,height:100,
          borderRadius:"50%",background:"rgba(255,255,255,0.05)"}} />
        <div style={{position:"relative",zIndex:1}}>
          <div style={{
            display:"flex",alignItems:"center",gap:10,
            background:"#F9F8F6",
            border:`1px solid ${C.cardBdr}`,
            borderRadius:999,padding:"8px 12px",width:"fit-content",
            marginBottom:14
          }}>
            <CalendarDays size={16} style={{color:C.txt}} />
            <div style={{lineHeight:1.1}}>
              <p style={{color:C.txt,fontSize:12.5,fontWeight:800}}>{weekday}</p>
              <p style={{color:C.faint,fontSize:12.5,fontWeight:600}}>{monthDay}</p>
            </div>
          </div>
          <h1 style={{fontSize:25,fontWeight:800,color:C.txt,marginBottom:20}}>
            Good morning, {userData.name.split(' ')[0]}{" "}
            <span style={{fontSize:18,display:"inline-block",verticalAlign:"middle",transform:"translateY(-1px)"}}>👋</span>
          </h1>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
            {[
              {label:"Saved Plans",value:plans.length,Icon: ClipboardList},
              {label:"Days Planned",value:totalDays,Icon: CalendarDays},
              {label:"Meals Saved",value:totalMeals,Icon: UtensilsCrossed},
            ].map((s,i) => (
              <div key={i} style={{
                background:"#F9F8F6",
                borderRadius:14,
                padding:"14px 16px",
                border:`1px solid ${C.cardBdr}`,
                backdropFilter:"none"
              }}>
                <div style={{marginBottom:6}}>
                  <s.Icon size={20} style={{color:C.txt}} />
                </div>
                <p style={{fontWeight:800,fontSize:28,color:C.txt,lineHeight:1,marginBottom:3}}>{s.value}</p>
                <p style={{color:C.faint,fontSize:11,fontWeight:600}}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:24}}>
        <div style={{background:C.white,borderRadius:16,padding:"18px",border:`1px solid ${C.cardBdr}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <p style={{fontWeight:700,fontSize:14,color:C.txt}}>Today's Meals</p>
            <button onClick={() => onNav("planner")}
              style={{fontSize:11,color:C.purple,background:"none",border:"none",cursor:"pointer",fontWeight:600}}>
              Open Planner →
            </button>
          </div>
          {todayMeals.length > 0 ? todayMeals.map((m, i) => {
            const MealIcon = MICON[m.type] || Sunrise
            return (
              <div key={i} style={{display:"flex",gap:10,alignItems:"center",padding:"8px 0",
                borderBottom: i < todayMeals.length - 1 ? `1px solid ${C.cardBdr}` : "none"}}>
                <div style={{width:34,height:34,borderRadius:9,background:MBG[m.type],
                  display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <MealIcon size={16} style={{color:"white"}} />
                </div>
                <div style={{flex:1}}>
                  <p style={{fontSize:12.5,fontWeight:600,color:C.txt}}>{m.name}</p>
                  <p style={{fontSize:11,color:C.faint}}>{m.type} · {m.cal} kcal · {m.time} min</p>
                </div>
              </div>
            )
          }) : <p style={{fontSize:13,color:C.faint,padding:"12px 0",textAlign:"center"}}>No meals planned today</p>}
        </div>
        <div style={{background:C.white,borderRadius:16,padding:"18px",border:`1px solid ${C.cardBdr}`}}>
          <p style={{fontWeight:700,fontSize:14,color:C.txt,marginBottom:14}}>Today's Calories</p>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <svg width={120} height={120}>
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F3F4F6" strokeWidth={10} />
              <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.accent} strokeWidth={10}
                strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ / 4} strokeLinecap="round" />
              <text x={cx} y={cy - 6} textAnchor="middle"
                style={{fontSize:18,fontWeight:800,fill:C.txt,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{consumed}</text>
              <text x={cx} y={cy + 12} textAnchor="middle"
                style={{fontSize:10,fill:C.faint,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>kcal</text>
            </svg>
            <div>
              <p style={{fontSize:22,fontWeight:800,color:C.txt,lineHeight:1}}>{consumed}</p>
              <p style={{fontSize:11,color:C.faint,marginTop:2}}>of {target} target</p>
              <p style={{fontSize:12,color:C.green,fontWeight:700,marginTop:6}}>{target - consumed} remaining</p>
              {[{l:"P",v:68,max:120,c:"#ef4444"},{l:"C",v:145,max:250,c:"#f59e0b"},{l:"F",v:42,max:80,c:C.purple}].map((m,i) => (
                <div key={i} style={{marginTop:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                    <span style={{fontSize:10,color:C.muted}}>{m.l}</span>
                    <span style={{fontSize:10,color:C.faint}}>{m.v}g</span>
                  </div>
                  <div style={{height:4,background:"#F3F4F6",borderRadius:999}}>
                    <div style={{height:"100%",width:`${(m.v/m.max)*100}%`,background:m.c,borderRadius:999}} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div style={{marginTop:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <p style={{fontWeight:700,fontSize:14,color:C.txt}}>Recently Saved Plans</p>
          <button onClick={() => onNav("plans")}
            style={{fontSize:11,color:C.purple,background:"none",border:"none",cursor:"pointer",fontWeight:600}}>
            View all →
          </button>
        </div>
        {plans.slice(0, 2).map(p => {
          const dm = DIET[p.diet] || DIET.Balanced
          return (
            <div key={p.id} style={{background:C.white,borderRadius:14,padding:"12px 16px",
              border:`1px solid ${C.cardBdr}`,display:"flex",alignItems:"center",gap:12,
              marginBottom:8,cursor:"pointer",transition:"border-color .15s"}}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = C.accent}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = C.cardBdr}>
              <div style={{width:38,height:38,borderRadius:10,background:dm.bg,
                display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <dm.icon size={18} style={{color:"white"}} />
              </div>
              <div style={{flex:1}}>
                <p style={{fontWeight:700,color:C.txt,fontSize:13,marginBottom:3}}>{p.title}</p>
                <p style={{fontSize:11,color:C.faint}}>{p.diet} · {p.days.length} days</p>
              </div>
              <ChevronRight size={14} style={{color:C.faint}} />
            </div>
          )
        })}
      </div>
      <div onClick={() => onNav("generate")} style={{
        background:"linear-gradient(135deg,#1a0533,#2d0a5e)",borderRadius:16,
        padding:"18px 22px",display:"flex",alignItems:"center",gap:16,cursor:"pointer",marginTop:8}}>
        <div style={{width:42,height:42,borderRadius:12,background:"rgba(198,160,246,0.2)",
          display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <Sparkles size={20} style={{color:C.accent}} />
        </div>
        <div style={{flex:1}}>
          <p style={{color:"white",fontSize:14,fontWeight:700,marginBottom:2}}>Plan your next week</p>
          <p style={{color:"rgba(198,160,246,0.6)",fontSize:12}}>Upload a receipt → get a full meal plan in seconds</p>
        </div>
        <ArrowUpRight size={16} style={{color:C.accent,flexShrink:0}} />
      </div>
    </div>
  )
}

// ─── Meal Planner ─────────────────────────────────────────────────────────────
function MealPlanner() {
  const [day, setDay] = useState(TODAY)
  const meals    = PLANNER[day] || []
  const consumed = meals.reduce((a, m) => a + m.cal, 0)
  const target   = 1800
  const r = 52, cx = 70, cy = 70, circ = 2 * Math.PI * r
  const dash = Math.min(consumed / target, 1) * circ
  return (
    <div>
      <div style={{marginBottom:22}}>
        <h1 style={{fontSize:24,fontWeight:800,color:C.txt}}>Meal Planner</h1>
        <p style={{color:C.muted,fontSize:13,marginTop:3}}>Week of March 23–29, 2026</p>
      </div>
      <div style={{background:"#FAF5FF",borderRadius:999,padding:"10px 8px",
        border:`1px solid rgba(198,160,246,0.25)`,marginBottom:18,display:"flex",gap:8}}>
        {WEEK.map((d, i) => {
          const sel = i === day, isToday = i === TODAY, has = (PLANNER[i] || []).length > 0
          return (
            <button key={d} onClick={() => setDay(i)} style={{
              flex:1,display:"flex",flexDirection:"column",alignItems:"center",
              padding:"10px 4px",borderRadius:999,border: sel ? "none" : `1px solid ${C.cardBdr}`,
              cursor:"pointer",background: sel ? `linear-gradient(135deg,${C.accentDark},${C.accent})` : "rgba(198,160,246,0.06)",
              transition:"all .15s",boxShadow: sel ? `0 10px 28px rgba(198,160,246,0.28)` : "none"}}>
              <span style={{fontSize:10,fontWeight:500,marginBottom:4,
                color: sel ? "rgba(255,255,255,0.78)" : C.faint}}>{d}</span>
              <span style={{fontWeight:700,fontSize:15,
                color: sel ? "white" : isToday ? C.accent : C.txt}}>{DATES[i]}</span>
              <div style={{width:18,height:6,borderRadius:999,marginTop:6,
                background: has ? (sel ? "rgba(255,255,255,0.65)" : "rgba(198,160,246,0.55)") : "transparent",
                border: has && !sel ? "1px solid rgba(198,160,246,0.30)" : "none"}} />
            </button>
          )
        })}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 250px",gap:14}}>
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <p style={{fontWeight:700,fontSize:14,color:C.txt}}>
              {WEEK[day]}, March {DATES[day]}{day === TODAY ? " · Today" : ""}
            </p>
            <button style={{display:"flex",alignItems:"center",gap:5,background:C.accent,
              color:"white",border:"none",borderRadius:8,padding:"6px 12px",
              fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
              <Plus size={12} /> Add Meal
            </button>
          </div>
          {meals.length > 0 ? meals.map((m, i) => {
            const MealIcon = MICON[m.type] || Sunrise
            return (
              <div key={i} style={{background:C.white,borderRadius:14,padding:"14px 16px",
                border:`1px solid ${C.cardBdr}`,display:"flex",gap:12,alignItems:"center",marginBottom:10}}>
                <div style={{width:42,height:42,borderRadius:11,background:MBG[m.type],
                  display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <MealIcon size={20} style={{color:"white"}} />
                </div>
                <div style={{flex:1}}>
                  <p style={{fontSize:11.5,fontWeight:600,color:MCOL[m.type],marginBottom:2}}>{m.type}</p>
                  <p style={{fontSize:14,fontWeight:700,color:C.txt,marginBottom:3}}>{m.name}</p>
                  <p style={{fontSize:11,color:C.faint}}>{m.cal} kcal · {m.time} min</p>
                </div>
              </div>
            )
          }) : (
            <div style={{background:C.white,borderRadius:14,padding:40,
              border:`2px dashed ${C.cardBdr}`,textAlign:"center"}}>
              <Utensils size={34} style={{color:C.purple,marginBottom:10}} />
              <p style={{fontWeight:700,color:C.txt,marginBottom:6}}>No meals planned</p>
              <p style={{fontSize:13,color:C.muted}}>Generate a plan and assign it to this day</p>
            </div>
          )}
        </div>
        <div>
          <div style={{background:C.white,borderRadius:16,padding:18,
            border:`1px solid ${C.cardBdr}`,marginBottom:12,textAlign:"center"}}>
            <p style={{fontWeight:700,fontSize:13,color:C.txt,marginBottom:12}}>Calories</p>
            <svg width={140} height={140} style={{display:"block",margin:"0 auto"}}>
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F3F4F6" strokeWidth={12} />
              <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.accent} strokeWidth={12}
                strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ / 4} strokeLinecap="round" />
              <text x={cx} y={cy - 8} textAnchor="middle"
                style={{fontSize:22,fontWeight:800,fill:C.txt,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{consumed}</text>
              <text x={cx} y={cy + 12} textAnchor="middle"
                style={{fontSize:10,fill:C.faint,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>of {target}</text>
            </svg>
            <p style={{fontSize:12,color: consumed >= target ? C.green : C.muted,fontWeight:600,marginTop:6}}>
              {consumed >= target ? "Target reached!" : `${target - consumed} kcal remaining`}
            </p>
          </div>
          <div style={{background:C.white,borderRadius:16,padding:"14px 16px",border:`1px solid ${C.cardBdr}`}}>
            <p style={{fontWeight:700,fontSize:13,color:C.txt,marginBottom:12}}>Macros</p>
            {[{l:"Protein",v:68,max:120,c:"#ef4444"},{l:"Carbs",v:145,max:250,c:"#f59e0b"},{l:"Fat",v:42,max:80,c:C.purple}].map((m,i) => (
              <div key={i} style={{marginBottom: i < 2 ? 10 : 0}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:11,fontWeight:600,color:C.txt}}>{m.l}</span>
                  <span style={{fontSize:11,color:C.faint}}>{m.v}/{m.max}g</span>
                </div>
                <div style={{height:5,background:"#F3F4F6",borderRadius:999}}>
                  <div style={{height:"100%",width:`${(m.v/m.max)*100}%`,background:m.c,borderRadius:999}} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Saved Plans ──────────────────────────────────────────────────────────────
interface SavedPlansProps { plans: Plan[] }

function SavedPlans({ plans }: SavedPlansProps) {
  const [filter,  setFilter]  = useState<DietKey>("All")
  const [deleted, setDeleted] = useState<string[]>([])
  const diets   = ["All" as DietKey, ...Array.from(new Set(plans.map(p => p.diet)))]
  const visible = plans.filter(p => !deleted.includes(p.id) && (filter === "All" || p.diet === filter))
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <h1 style={{fontSize:24,fontWeight:800,color:C.txt}}>Saved Plans</h1>
        <span style={{fontSize:12,color:C.muted,background:C.white,
          border:`1px solid ${C.cardBdr}`,padding:"4px 12px",borderRadius:999}}>{visible.length} saved</span>
      </div>
      <div style={{display:"flex",gap:7,marginBottom:22,flexWrap:"wrap"}}>
        {diets.map(d => {
          const dm = DIET[d] || DIET.Balanced, on = filter === d
          return (
            <button key={d} onClick={() => setFilter(d)} style={{
              display:"flex",alignItems:"center",gap:5,padding:"6px 14px",borderRadius:999,
              fontSize:12.5,fontWeight: on ? 700 : 500,
              border: on ? "none" : `1px solid ${C.cardBdr}`,
              background: on ? dm.col : C.white, color: on ? "white" : dm.col,
              cursor:"pointer",transition:"all .15s",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
              <dm.icon size={16} style={{color: on ? "white" : dm.col}} />{d}
            </button>
          )
        })}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:14}}>
        {visible.map(plan => {
          const dm = DIET[plan.diet] || DIET.Balanced
          return (
            <div key={plan.id} style={{background:C.white,borderRadius:16,overflow:"hidden",
              border:`1px solid ${C.cardBdr}`,cursor:"pointer",transition:"all .18s"}}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.07)" }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "" }}>
              <div style={{height:4,background:`linear-gradient(90deg,${dm.col},${C.accent})`}} />
              <div style={{padding:18}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                  <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                    <dm.icon size={22} style={{color:"white",flexShrink:0}} />
                    <div>
                      <p style={{fontWeight:700,color:C.txt,fontSize:14,marginBottom:4}}>{plan.title}</p>
                      <span style={{fontSize:11,fontWeight:600,color:dm.col,background:dm.bg,
                        padding:"2px 8px",borderRadius:999}}>{plan.diet}</span>
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); setDeleted(d => [...d, plan.id]) }}
                    style={{width:26,height:26,borderRadius:7,background:"#FEF2F2",border:"none",
                      cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <Trash2 size={11} style={{color:C.red}} />
                  </button>
                </div>
                <div style={{background:"#F9F8F6",borderRadius:10,padding:"10px 12px",marginBottom:12}}>
                  {plan.days.slice(0, 2).map((dayItem, i) => (
                    <div key={i} style={{display:"flex",gap:8,marginBottom: i < 1 ? 6 : 0}}>
                      <span style={{fontSize:10,fontWeight:700,color:C.purple,width:24,flexShrink:0}}>{dayItem.day}</span>
                      <span style={{fontSize:11,color:C.muted,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>
                        {dayItem.B.name} · {dayItem.L.name}
                      </span>
                    </div>
                  ))}
                  {plan.days.length > 2 && <p style={{fontSize:11,color:C.faint,marginTop:4}}>+{plan.days.length - 2} more days</p>}
                </div>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <p style={{fontSize:11.5,color:C.faint}}>{plan.days.length} days · {plan.days.length * 3} meals</p>
                  <p style={{fontSize:11,color:C.faint}}>{new Date(plan.date).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</p>
                </div>
              </div>
            </div>
          )
        })}
        <div style={{background:"#FAF5FF",borderRadius:16,border:`2px dashed rgba(198,160,246,0.75)`,
          display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
          padding:32,cursor:"pointer",minHeight:200,transition:"background .15s"}}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#F3E8FF"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#FAF5FF"}>
          <div style={{width:44,height:44,borderRadius:12,background:"rgba(198,160,246,0.18)",
            display:"flex",alignItems:"center",justifyContent:"center",marginBottom:10}}>
            <Plus size={20} style={{color:C.purple}} />
          </div>
          <p style={{fontWeight:700,color:C.purple,fontSize:13}}>Save a New Plan</p>
          <p style={{fontSize:11,color:C.accent,marginTop:4}}>Generate &amp; save a plan</p>
        </div>
      </div>
    </div>
  )
}

// ─── Saved Recipes ────────────────────────────────────────────────────────────
function SavedRecipes() {
  const [filter, setFilter] = useState("All")
  const types  = ["All","Breakfast","Lunch","Dinner"]
  const icons: Record<string, React.ElementType> = { All: Sparkles, Breakfast: Sunrise, Lunch: Sun, Dinner: Moon }
  const visible = RECIPES.filter(r => filter === "All" || r.type === filter)
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <h1 style={{fontSize:24,fontWeight:800,color:C.txt}}>Saved Recipes</h1>
        <span style={{fontSize:12,color:C.muted,background:C.white,
          border:`1px solid ${C.cardBdr}`,padding:"4px 12px",borderRadius:999}}>{visible.length} recipes</span>
      </div>
      <div style={{display:"flex",gap:7,marginBottom:22}}>
        {types.map(t => {
          const on = filter === t
          const Icon = icons[t]
          return (
            <button key={t} onClick={() => setFilter(t)} style={{
              display:"flex",alignItems:"center",gap:5,padding:"6px 14px",borderRadius:999,
              fontSize:12.5,fontWeight: on ? 700 : 500,
              border: on ? "none" : `1px solid ${C.cardBdr}`,
              background: on ? C.accentDark : C.white, color: on ? "white" : C.txt,
              cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif",transition:"all .15s"}}>
              <span style={{
                width:26,height:26,borderRadius:999,
                display:"flex",alignItems:"center",justifyContent:"center",
                background: on ? "rgba(255,255,255,0.18)" : "rgba(198,160,246,0.12)",
                border: on ? "1px solid rgba(255,255,255,0.35)" : "1px solid rgba(198,160,246,0.22)",
              }}>
                <Icon size={14} style={{color: on ? "white" : C.txt}} />
              </span>
              {t}
            </button>
          )
        })}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))",gap:12}}>
        {visible.map(r => (
          <div key={r.id} style={{background:C.white,borderRadius:14,border:`1px solid ${C.cardBdr}`,
            overflow:"hidden",cursor:"pointer",transition:"all .18s"}}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 20px rgba(0,0,0,0.07)" }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "" }}>
            <div style={{height:80,background:MBG[r.type]||"#F3F4F6",
              display:"flex",alignItems:"center",justifyContent:"center"}}>
              {(() => {
                const Icon = icons[r.type]
                return <Icon size={26} style={{color:"rgba(255,255,255,0.95)"}} />
              })()}
            </div>
            <div style={{padding:"12px 14px"}}>
              <p style={{fontWeight:700,fontSize:13,color:C.txt,marginBottom:8}}>{r.title}</p>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",gap:8}}>
                  <span style={{fontSize:11,color:C.faint,display:"flex",alignItems:"center",gap:3}}>
                    <Clock size={10} />{r.time}m
                  </span>
                  <span style={{fontSize:11,color:C.faint,display:"flex",alignItems:"center",gap:3}}>
                    <Flame size={10} />{r.cal}
                  </span>
                </div>
                <Heart size={13} style={{color:C.red,fill:C.red}} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Search Results Override ────────────────────────────────────────────
function SearchResults({
  plans,
  recipes,
  query,
}: {
  plans: Plan[]
  recipes: Recipe[]
  query: string
}) {
  const hasAny = plans.length > 0 || recipes.length > 0
  const recipeIcons: Record<string, React.ElementType> = { Breakfast: Sunrise, Lunch: Sun, Dinner: Moon }

  return (
    <div style={{background:C.white,borderRadius:20,padding:"18px 18px",border:`1px solid ${C.cardBdr}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:14,marginBottom:14}}>
        <div>
          <p style={{fontSize:12,color:C.faint,fontWeight:700,letterSpacing:".06em",textTransform:"uppercase",marginBottom:6}}>
            Search results
          </p>
          <h2 style={{fontSize:20,fontWeight:900,color:C.txt,marginBottom:4}}>“{query}”</h2>
          <p style={{fontSize:12.5,color:C.muted,fontWeight:600}}>
            {plans.length + recipes.length} match{plans.length + recipes.length === 1 ? "" : "es"}
          </p>
        </div>
      </div>

      {!hasAny ? (
        <div style={{padding:28,borderRadius:16,border:`2px dashed ${C.cardBdr}`,textAlign:"center"}}>
          <p style={{fontWeight:900,color:C.txt,marginBottom:6}}>No matches</p>
          <p style={{fontSize:13,color:C.faint}}>Try searching by plan name or recipe type.</p>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"1fr",gap:12}}>
          {plans.length > 0 && (
            <div>
              <p style={{fontWeight:900,color:C.txt,marginBottom:10}}>Meal Plans</p>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
                {plans.map(p => {
                  const dm = DIET[p.diet] || DIET.Balanced
                  return (
                    <div
                      key={p.id}
                      style={{background:C.white,borderRadius:16,padding:14,border:`1px solid ${C.cardBdr}`,display:"flex",gap:12,alignItems:"center"}}
                    >
                      <div style={{width:42,height:42,borderRadius:12,background:dm.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <dm.icon size={20} style={{color:dm.col}} />
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontSize:13.5,fontWeight:900,color:C.txt,marginBottom:3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.title}</p>
                        <p style={{fontSize:12,color:C.faint,fontWeight:700}}>{p.diet} · {p.days.length} days</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {recipes.length > 0 && (
            <div>
              <p style={{fontWeight:900,color:C.txt,marginBottom:10}}>Recipes</p>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
                {recipes.map(r => {
                  const Icon = recipeIcons[r.type] || Sparkles
                  return (
                    <div
                      key={r.id}
                      style={{background:C.white,borderRadius:16,padding:14,border:`1px solid ${C.cardBdr}`,display:"flex",gap:12,alignItems:"center"}}
                    >
                      <div style={{width:42,height:42,borderRadius:12,background:MBG[r.type] || "#F3F4F6",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <Icon size={20} style={{color:C.txt}} />
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontSize:13.5,fontWeight:900,color:C.txt,marginBottom:3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.title}</p>
                        <p style={{fontSize:12,color:C.faint,fontWeight:700}}>
                          {r.type} · {r.cal} kcal · {r.time}m
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Generate ─────────────────────────────────────────────────────────────────
function Generate() {
  const navigate = useNavigate()
  const [hov, setHov] = useState<number|null>(null)
  
  const handleGenerate = () => {
    // Navigate to home where the actual generate flow happens
    navigate('/')
    setTimeout(() => {
      const uploadSection = document.getElementById('upload-section')
      if (uploadSection) {
        uploadSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }
  
  return (
    <div>
      <h1 style={{fontSize:24,fontWeight:800,color:C.txt,marginBottom:6}}>Generate a Meal Plan</h1>
      <p style={{color:C.muted,fontSize:13,marginBottom:28}}>Tell us what you've got. We'll handle the rest.</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:24}}>
        {[
          { Icon: Camera, label:"Upload a Receipt", desc:"Take a photo of your grocery receipt" },
          { Icon: PencilLine, label:"Type or Paste", desc:"Enter your grocery items directly" },
        ].map((o,i) => (
          <div key={i} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}
            onClick={handleGenerate}
            style={{background:C.white,borderRadius:16,
              border:`2px solid ${hov === i ? C.accent : C.cardBdr}`,
              padding:28,cursor:"pointer",transition:"all .15s",textAlign:"center"}}>
            <p style={{fontSize:36,marginBottom:12, display:"flex", justifyContent:"center"}}>
              <o.Icon size={40} style={{color:C.accent}} />
            </p>
            <p style={{fontWeight:700,color:C.txt,fontSize:15,marginBottom:6}}>{o.label}</p>
            <p style={{color:C.muted,fontSize:12}}>{o.desc}</p>
          </div>
        ))}
      </div>
      <div style={{background:C.white,borderRadius:16,padding:20,border:`1px solid ${C.cardBdr}`,marginBottom:22}}>
        <p style={{fontWeight:700,fontSize:13,color:C.txt,marginBottom:12}}>Diet Preference</p>
        <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
          {(Object.entries(DIET) as [DietKey, typeof DIET[DietKey]][]).filter(([k]) => k !== "All").map(([d, dm], i) => (
            <button key={d} style={{
              display:"flex",alignItems:"center",gap:5,padding:"7px 14px",borderRadius:999,
              fontSize:12.5,fontWeight: i === 0 ? 700 : 500,
              border: i === 0 ? "none" : `1px solid ${C.cardBdr}`,
              background: i === 0 ? C.purple : C.white, color: i === 0 ? "white" : C.txt,
              cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
              <dm.icon size={16} style={{color: i === 0 ? "white" : dm.col}} />{d}
            </button>
          ))}
        </div>
      </div>
      <button 
        onClick={handleGenerate}
        style={{background:C.accent,color:"white",padding:"12px 28px",borderRadius:999,
        fontWeight:700,fontSize:14,border:"none",cursor:"pointer",
        display:"flex",alignItems:"center",gap:8,
        fontFamily:"'Plus Jakarta Sans',sans-serif",
        boxShadow:"0 4px 14px rgba(198,160,246,0.45)"}}>
        <Sparkles size={16} /> Generate Meal Plan
      </button>
    </div>
  )
}

// ─── Profile ──────────────────────────────────────────────────────────────────
interface ProfileProps { user: UserData; plans: Plan[] }

function Profile({ user, plans }: ProfileProps) {
  const totalDays = plans.reduce((a, p) => a + p.days.length, 0)
  const diets     = Array.from(new Set(plans.map(p => p.diet)))
  return (
    <div style={{maxWidth:560}}>
      <h1 style={{fontSize:24,fontWeight:800,color:C.txt,marginBottom:20}}>Profile</h1>
      <div style={{background:C.white,borderRadius:18,border:`1px solid ${C.cardBdr}`,
        padding:"22px",marginBottom:12,display:"flex",alignItems:"center",gap:18}}>
        <div style={{position:"relative"}}>
          <div style={{width:68,height:68,borderRadius:18,
            background:`linear-gradient(135deg,${C.accent},${C.accentDark})`,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontWeight:800,fontSize:28,color:"white"}}>
            {user.name.charAt(0)}
          </div>
          <div style={{position:"absolute",bottom:-3,right:-3,width:20,height:20,
            borderRadius:6,background:C.green,display:"flex",alignItems:"center",
            justifyContent:"center",border:"2px solid white"}}>
            <span style={{fontSize:9,color:"white",fontWeight:700}}>✓</span>
          </div>
        </div>
        <div>
          <p style={{fontWeight:800,fontSize:18,color:C.txt,marginBottom:3}}>{user.name}</p>
          <p style={{color:C.muted,fontSize:13}}>{user.email}</p>
          <p style={{color:C.faint,fontSize:11,marginTop:3}}>Member since {user.joined}</p>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:12}}>
        {[
          {label:"Saved Plans",value:plans.length,Icon: ClipboardList},
          {label:"Days Planned",value:totalDays,Icon: CalendarDays},
          {label:"Diets Tried",value:diets.length,Icon: Sparkles},
        ].map((s,i) => (
          <div key={i} style={{background:C.white,borderRadius:14,padding:"14px 16px",
            border:`1px solid ${C.cardBdr}`,textAlign:"center"}}>
            <div style={{marginBottom:6}}>
              <s.Icon size={20} style={{color:C.purple}} />
            </div>
            <p style={{fontWeight:800,fontSize:22,color:C.txt,lineHeight:1}}>{s.value}</p>
            <p style={{fontSize:11,color:C.faint,marginTop:3}}>{s.label}</p>
          </div>
        ))}
      </div>
      <div style={{background:C.white,borderRadius:16,border:`1px solid ${C.cardBdr}`,
        padding:"18px 20px",marginBottom:12}}>
        <p style={{fontWeight:700,fontSize:13,color:C.txt,marginBottom:12}}>Account Details</p>
        {([{label:"Full Name",value:user.name},{label:"Email",value:user.email},
          {label:"Member Since",value:user.joined}] as {label:string;value:string}[]).map((f,i,arr) => (
          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
            padding:"10px 0",borderBottom: i < arr.length - 1 ? `1px solid ${C.cardBdr}` : "none"}}>
            <span style={{color:C.muted,fontSize:13}}>{f.label}</span>
            <span style={{color:C.txt,fontSize:13,fontWeight:600}}>{f.value}</span>
          </div>
        ))}
      </div>
      <div style={{background:C.white,borderRadius:16,border:`1px solid ${C.cardBdr}`,
        padding:"18px 20px",marginBottom:12}}>
        <p style={{fontWeight:700,fontSize:13,color:C.txt,marginBottom:12}}>Diets You've Tried</p>
        <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
          {diets.map(d => {
            const dm = DIET[d]
            return (
              <span key={d} style={{display:"inline-flex",alignItems:"center",gap:4,
                fontSize:12,fontWeight:600,color:dm.col,background:dm.bg,
                padding:"5px 12px",borderRadius:999}}>
                <dm.icon size={14} style={{color:dm.col}} />{d}
              </span>
            )
          })}
        </div>
      </div>
      <div style={{background:"#FFF5F5",borderRadius:16,border:"1px solid #FECACA",padding:"18px 20px"}}>
        <p style={{fontWeight:700,fontSize:13,color:C.red,marginBottom:2}}>Sign Out</p>
        <p style={{fontSize:12,color:"#f87171",marginBottom:12}}>You'll be returned to the Edible home page.</p>
        <button style={{background:"#FEE2E2",border:"1px solid #FECACA",color:C.red,
          padding:"8px 18px",borderRadius:9,fontWeight:600,fontSize:13,cursor:"pointer",
          fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Sign Out</button>
      </div>
    </div>
  )
}

// ─── Root Dashboard ───────────────────────────────────────────────────────────
export default function EdibleDashboard() {
  const navigate = useNavigate()
  const { user, isLoading: authLoading } = useAuth()
  const [view, setView] = useState<NavId>("overview")
  const [search, setSearch] = useState("")
  const [showDrop, setShowDrop] = useState(false)
  const [plans, setPlans] = useState<Plan[]>(PLANS)
  const [isLoadingPlans, setIsLoadingPlans] = useState(true)
  const [userData, setUserData] = useState<UserData>(DEFAULT_USER_DATA)
  const [isLoadingUser, setIsLoadingUser] = useState(true)

  // Fetch user data from Supabase on mount
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user || authLoading) return
      try {
        setIsLoadingUser(true)
        const profile = await getProfile()
        if (profile) {
          setUserData({
            name: profile.name || user.email?.split('@')[0] || 'User',
            email: profile.email || user.email || '',
            joined: profile.joined || new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          })
        } else {
          setUserData({
            name: user.email?.split('@')[0] || 'User',
            email: user.email || '',
            joined: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          })
        }
      } catch (error) {
        console.error('Failed to load user profile:', error)
        setUserData({
          name: user.email?.split('@')[0] || 'User',
          email: user.email || '',
          joined: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        })
      } finally {
        setIsLoadingUser(false)
      }
    }

    fetchUserData()
  }, [user, authLoading])

  // Fetch meal plans from Supabase on mount
  useEffect(() => {
    const fetchPlans = async () => {
      if (!user || authLoading) return
      try {
        setIsLoadingPlans(true)
        const mealPlans = await getUserMealPlans()
        
        // Transform Supabase meal plans to dashboard format
        const transformedPlans: Plan[] = mealPlans.map(mp => ({
          id: mp.id,
          title: mp.title,
          diet: (mp.plan_data?.diet || 'Balanced') as DietKey,
          date: mp.created_at || new Date().toISOString(),
          days: mp.plan_data?.days || []
        }))
        
        setPlans(transformedPlans.length > 0 ? transformedPlans : PLANS)
      } catch (error) {
        console.error('Failed to load meal plans:', error)
        setPlans(PLANS) // Fall back to mock data
      } finally {
        setIsLoadingPlans(false)
      }
    }

    fetchPlans()
  }, [user, authLoading])

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/')
    }
  }, [user, authLoading, navigate])

  const query = search.trim().toLowerCase()
  const showSearch = query.length > 1

  const matchedPlans = showSearch
    ? plans.filter(p => p.title.toLowerCase().includes(query) || p.diet.toLowerCase().includes(query))
    : []
  const matchedRecipes = showSearch
    ? RECIPES.filter(r => r.title.toLowerCase().includes(query) || r.type.toLowerCase().includes(query))
    : []

  const results = showSearch
    ? [
      ...matchedPlans.map(p => ({ type:"plan" as const, label:p.title, sub:`${p.diet} · ${p.days.length} days`, nav:"plans" as NavId })),
      ...matchedRecipes.map(r => ({ type:"recipe" as const, label:r.title, sub:`${r.type} · ${r.cal} kcal`, nav:"recipes" as NavId })),
    ]
    : []

  const go = (id: NavId) => {
    if (id === "logout") { navigate("/"); return }
    setView(id); setSearch(""); setShowDrop(false)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body,button,input{font-family:'Plus Jakarta Sans',sans-serif}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#E5E7EB;border-radius:4px}
        .dashboard-home-btn{transition:all .15s ease}
        .dashboard-home-btn:hover{
          background:rgba(181,141,245,0.14);
          transform:translateY(-1px);
          border-color:${C.accentDark};
        }
      `}</style>
      <div style={{display:"flex",height:"100vh",overflow:"hidden",
        fontFamily:"'Plus Jakarta Sans',sans-serif",background:C.bg}}>
        <Sidebar active={view} onNav={go} userData={userData} />
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <header style={{height:56,background:"rgba(245,243,239,0.92)",backdropFilter:"blur(10px)",
            borderBottom:"1px solid #EDE9E2",display:"flex",alignItems:"center",
            padding:"0 24px",gap:12,flexShrink:0}}>
            {/* Back to home */}
            <button
              className="dashboard-home-btn"
              onClick={() => navigate("/")}
              style={{
                fontSize:12,fontWeight:600,color:C.muted,background:"transparent",border:`1px solid ${C.cardBdr}`,
                borderRadius:8,padding:"5px 12px",cursor:"pointer",whiteSpace:"nowrap",
                fontFamily:"'Plus Jakarta Sans',sans-serif",transition:"all .15s ease"
              }}
            >
              ← Home
            </button>
            <div style={{position:"relative",flex:1,maxWidth:320}}>
              <div style={{display:"flex",alignItems:"center",gap:8,background:C.white,
                borderRadius:10,padding:"7px 12px",
                border:`1px solid ${showDrop && search ? C.accent : C.cardBdr}`}}>
                <Search size={13} style={{color:C.faint,flexShrink:0}} />
                <input value={search}
                  onChange={e => { setSearch(e.target.value); setShowDrop(true) }}
                  onFocus={() => setShowDrop(true)}
                  onBlur={() => setTimeout(() => setShowDrop(false), 200)}
                  placeholder="Search plans and recipes…"
                  style={{border:"none",outline:"none",fontSize:13,background:"transparent",color:C.txt,width:"100%"}} />
                {search && (
                  <button onClick={() => setSearch("")}
                    style={{background:"none",border:"none",cursor:"pointer",color:C.faint,padding:0,display:"flex"}}>
                    <X size={11} />
                  </button>
                )}
              </div>
              {showDrop && results.length > 0 && (
                <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,right:0,
                  background:C.white,borderRadius:12,border:`1px solid ${C.cardBdr}`,
                  boxShadow:"0 8px 24px rgba(0,0,0,0.1)",zIndex:100,overflow:"hidden"}}>
                  {results.map((r, i) => (
                    <div key={i} onClick={() => { setShowDrop(false) }}
                      style={{padding:"10px 14px",display:"flex",gap:10,alignItems:"center",
                        cursor:"pointer",borderBottom: i < results.length - 1 ? `1px solid ${C.cardBdr}` : "none"}}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#F9F8F6"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                      <span style={{
                        width:28,height:28,borderRadius:999,
                        background:"rgba(198,160,246,0.12)",
                        border:"1px solid rgba(198,160,246,0.22)",
                        display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0
                      }}>
                        {r.type === "plan" ? (
                          <ClipboardList size={14} style={{color:C.accent}} />
                        ) : (
                          <UtensilsCrossed size={14} style={{color:C.accent}} />
                        )}
                      </span>
                      <div>
                        <p style={{fontSize:13,fontWeight:600,color:C.txt}}>{r.label}</p>
                        <p style={{fontSize:11,color:C.faint}}>{r.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {showDrop && search.length > 1 && results.length === 0 && (
                <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,right:0,
                  background:C.white,borderRadius:12,border:`1px solid ${C.cardBdr}`,
                  boxShadow:"0 8px 24px rgba(0,0,0,0.1)",zIndex:100,padding:16,textAlign:"center"}}>
                  <p style={{fontSize:13,color:C.faint}}>No results for "{search}"</p>
                </div>
              )}
            </div>
            <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:10}}>
              <button style={{width:34,height:34,borderRadius:10,background:C.white,
                border:`1px solid ${C.cardBdr}`,display:"flex",alignItems:"center",
                justifyContent:"center",cursor:"pointer"}}>
                <Bell size={14} style={{color:C.muted}} />
              </button>
              <div onClick={() => go("profile")} style={{width:34,height:34,borderRadius:10,
                background:`linear-gradient(135deg,${C.accent},${C.accentDark})`,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontWeight:800,color:"white",fontSize:14,cursor:"pointer"}}>S</div>
            </div>
          </header>
          <main style={{flex:1,overflowY:"auto",padding:"16px 28px 32px 28px"}}>
            <div style={{maxWidth:860,margin:"0 auto"}}>
              {showSearch ? (
                <SearchResults plans={matchedPlans} recipes={matchedRecipes} query={search.trim()} />
              ) : (
                <>
                  {view === "overview" && <Overview plans={plans} onNav={go} userData={userData} />}
                  {view === "planner"  && <MealPlanner />}
                  {view === "plans"    && <SavedPlans plans={plans} />}
                  {view === "recipes"  && <SavedRecipes />}
                  {view === "generate" && <Generate />}
                  {view === "profile"  && <Profile user={userData} plans={plans} />}
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </>
  )
}