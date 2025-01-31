-- force canonical name require
if ... ~= "__debugadapter__/debugadapter.lua" then
  return require("__debugadapter__/debugadapter.lua")
end

if __Profiler then
  log{"", "Attempted to require debugadapter in ", script.mod_name, " with profile hook already installed"}
  return
end

if data then
  -- data stage clears package.loaded between files, so we stash a copy in Lua registry too
  local reg = debug.getregistry()
  ---@type DebugAdapter
  local regDA = reg.__DebugAdapter
  if regDA then return regDA end
end



-- this is a global so the vscode extension can get to it from debug.debug()
---@class DebugAdapter : DebugAdapter.Stepping.Public
local __DebugAdapter = _ENV.__DebugAdapter or {} -- but might have been defined already for selective instrument mode
_ENV.__DebugAdapter = __DebugAdapter

---@class DebugAdapter.ClientInterface: DebugAdapter.Stepping.DAP, DebugAdapter.Variables, DebugAdapter.Stacks
__DebugAdapter.__dap = {}

-- Various fields set by vscode to configure the debug adapter
---@class DebugAdapter.Config
---@field instrument boolean set in DA's instrument-*.lua
---@field nohook boolean set in DA's control.lua if it does not have hooks installed
---@field hooklog? boolean enable replacing `log`
---@field keepoldlog? boolean when set, `log` replacement will still call original `log`
---@field runningBreak? number frequency to check for pause in long-running code
__DebugAdapter.__config = __DebugAdapter.__config or {}

---@param to table<string,any>
---@param from table<string,any>
local function merge(to, from)
  for k, v in pairs(from) do
    to[k] = v
  end
end

local require = require
local script = script
local debug = debug
local print = print
local pairs = pairs

local threads = require("__debugadapter__/threads.lua")
local dispatch = require("__debugadapter__/dispatch.lua")
local variables = require("__debugadapter__/variables.lua")
local evaluate = require("__debugadapter__/evaluate.lua")
local daprint = require("__debugadapter__/print.lua")
local stepping = require("__debugadapter__/stepping.lua")
local stacks = require("__debugadapter__/stacks.lua")

local env = _ENV
local _ENV = nil

__DebugAdapter.print = daprint.print
merge(__DebugAdapter, stepping.__pub)

__DebugAdapter.__dap.threads = threads.__dap.threads
merge(__DebugAdapter.__dap, variables.__dap)
__DebugAdapter.__dap.evaluate = evaluate.evaluate
merge(__DebugAdapter.__dap, stepping.__dap)
merge(__DebugAdapter.__dap, stacks)

if __DebugAdapter.__config.hooklog ~= false then
  require("__debugadapter__/log.lua")
end
require("__debugadapter__/test.lua")

for k, v in pairs(dispatch.__inner) do
  dispatch.__remote[k] = stepping.unhook(v)
end


---Force the DA Client to refresh everything
---@public
function __DebugAdapter.refresh()
  print("\xEF\xB7\x98")
end

do
  local ininstrument = ""
  if __DebugAdapter.__config.instrument then
    ininstrument = " in Instrument Mode"
  end

  if env.data then
    daprint.print("debugadapter registered for data" .. ininstrument, nil, nil, "console")
    stepping.attach()
    print("\xEF\xB7\x90\xEE\x80\x87")
    debug.debug()
    -- data stage clears package.loaded between files, so we stash a copy in Lua registry too
    local reg = debug.getregistry()
    reg.__DebugAdapter = __DebugAdapter
  else
    -- in addition to the global, set up a remote so we can configure from DA's on_tick
    -- and pass stepping state around remote calls
    daprint.print("debugadapter registered for " .. script.mod_name .. ininstrument, nil, nil, "console")

    stepping.attach()
    print("\xEF\xB7\x90\xEE\x80\x88")
    debug.debug()
  end
end

return __DebugAdapter