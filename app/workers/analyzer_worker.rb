class AnalyzerWorker < DaemonSpawn::Base

  INTERVAL = 5

  WORKER_PID_FILE = Rails.root.join('tmp', 'pids', "analyzer_worker_#{Rails.env}.pid")
  WORKER_LOG_FILE = Rails.root.join('log', "analyzer_worker_#{Rails.env}.log")
  WORKER_STDOUT_FILE = Rails.root.join('log', "analyzer_worker_#{Rails.env}_out.log")

  def start(args)
    @logger = Logger.new(WORKER_LOG_FILE, 7)
    @logger.level = Logger::INFO
    @logger.info("starting")

    @term_received = false
    trap('TERM') {
      @term_received = true
      @logger.info("TERM received. stopping")
    }

    loop do
      AnalyzerRunner.perform(@logger)
      break if @term_received
      if Analysis.where(status: :created).count == 0
        @logger.info("sleep #{INTERVAL}")
        sleep INTERVAL
      end
      break if @term_received
    end

    @logger.info("stopped")
  end

  def stop
    # Never called because trap('TERM') is overwritten
  end

  def self.alive?
    if File.file?(WORKER_PID_FILE)
      pid = (IO.read(WORKER_PID_FILE).to_i)
      DaemonSpawn.alive? pid
    else
      false
    end
  end

  # return true if the time stamp of the log file is updated within five minutes
  LOG_UPDATE_THRESHOLD = 60 * 5 # 5 minutes
  def self.log_recently_updated?
    if File.file?(WORKER_LOG_FILE)
      s = File.stat(WORKER_LOG_FILE)
      return true if Time.now - s.mtime < LOG_UPDATE_THRESHOLD
    end
    false
  end
end

